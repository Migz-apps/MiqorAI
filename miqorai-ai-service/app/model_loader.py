from __future__ import annotations

import logging
from dataclasses import dataclass

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from app.config import settings
from app.json_repair import parse_and_repair_json, to_alert_response
from app.prompt_builder import build_chat_messages
from app.schemas import ClinicalSafetyCheckRequest

logger = logging.getLogger(__name__)


@dataclass
class InferenceRuntime:
    model: AutoModelForCausalLM
    tokenizer: AutoTokenizer
    device: str
    use_4bit: bool

    @classmethod
    def load(cls) -> InferenceRuntime:
        adapter_dir = settings.adapter_dir
        if not adapter_dir.exists():
            raise FileNotFoundError(
                f"LoRA adapter not found at {adapter_dir.resolve()}. "
                "Copy your trained adapter into model/miqorai-qwen1.5-0.5b-lora-json-v3/"
            )
        if not (adapter_dir / "adapter_config.json").exists():
            raise FileNotFoundError(f"Missing adapter_config.json in {adapter_dir.resolve()}")

        cuda_available = torch.cuda.is_available()
        if not cuda_available:
            logger.warning("CUDA not detected. CPU inference will be very slow.")

        use_4bit = settings.use_4bit and cuda_available
        bnb_config = None
        if use_4bit:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
                bnb_4bit_use_double_quant=True,
            )

        tokenizer_source = (
            str(adapter_dir) if (adapter_dir / "tokenizer_config.json").exists() else settings.base_model_id
        )
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, trust_remote_code=settings.trust_remote_code)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        logger.info("Loading base model: %s", settings.base_model_id)
        model = AutoModelForCausalLM.from_pretrained(
            settings.base_model_id,
            quantization_config=bnb_config,
            device_map="auto" if cuda_available else None,
            trust_remote_code=settings.trust_remote_code,
        )
        if not cuda_available:
            model = model.to("cpu")

        logger.info("Loading LoRA adapter from: %s", adapter_dir.resolve())
        model = PeftModel.from_pretrained(model, str(adapter_dir))
        model.eval()

        device = str(next(model.parameters()).device)
        logger.info("Model loaded on device: %s (4-bit=%s)", device, use_4bit)
        return cls(model=model, tokenizer=tokenizer, device=device, use_4bit=use_4bit)

    @torch.inference_mode()
    def generate_raw(self, request: ClinicalSafetyCheckRequest) -> str:
        messages = build_chat_messages(request)
        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {key: value.to(self.model.device) for key, value in inputs.items()}

        outputs = self.model.generate(
            **inputs,
            max_new_tokens=settings.max_new_tokens,
            do_sample=False,
            repetition_penalty=settings.repetition_penalty,
            no_repeat_ngram_size=settings.no_repeat_ngram_size,
            pad_token_id=self.tokenizer.pad_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )
        generated = outputs[0][inputs["input_ids"].shape[1] :]
        return self.tokenizer.decode(generated, skip_special_tokens=True).strip()

    def check_clinical_safety(self, request: ClinicalSafetyCheckRequest) -> tuple[dict, str, bool]:
        raw_output = self.generate_raw(request)
        repaired, used_fallback = parse_and_repair_json(raw_output)
        alert = to_alert_response(repaired)
        return alert, raw_output, used_fallback


_runtime: InferenceRuntime | None = None


def get_runtime() -> InferenceRuntime:
    if _runtime is None:
        raise RuntimeError("Inference runtime is not loaded")
    return _runtime


def load_inference_runtime() -> InferenceRuntime:
    global _runtime
    _runtime = InferenceRuntime.load()
    return _runtime


def is_model_loaded() -> bool:
    return _runtime is not None
