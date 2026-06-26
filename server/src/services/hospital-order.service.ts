import { PrescriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { touchPatientData } from "./qr.service.js";

export interface PrescriptionItemInput {
  drug_name: string;
  generic_name?: string;
  strength: string;
  dosage: string;
  quantity: number;
  frequency?: string;
  duration_days: number;
  unit_price?: number;
}

export interface PrescriptionOrderBody {
  patient_id: string;
  visit_id?: string;
  pharmacy_id?: string;
  notes?: string;
  diagnosis?: string;
  insurance_provider?: string;
  insurance_member?: string;
  items?: PrescriptionItemInput[];
  drug_name?: string;
  strength?: string;
  dosage?: string;
  quantity?: number;
  frequency?: string;
  duration_days?: number;
}

export interface LabOrderBody {
  patient_id: string;
  visit_id?: string;
  test_name: string;
  test_code?: string;
}

export function normalizePrescriptionItems(body: PrescriptionOrderBody): PrescriptionItemInput[] {
  if (body.items?.length) {
    return body.items.map((item) => ({
      ...item,
      unit_price: item.unit_price ?? 0,
    }));
  }

  if (body.drug_name) {
    return [
      {
        drug_name: body.drug_name,
        strength: body.strength!,
        dosage: body.dosage!,
        quantity: body.quantity!,
        frequency: body.frequency,
        duration_days: body.duration_days!,
        unit_price: 0,
      },
    ];
  }

  return [];
}

export async function createPrescriptionOrder(
  hospitalId: string,
  userId: string,
  body: PrescriptionOrderBody,
) {
  const items = normalizePrescriptionItems(body);
  if (!items.length) {
    throw new Error("At least one prescription item required");
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.unit_price ?? 0) * item.quantity,
    0,
  );

  const prescription = await prisma.prescription.create({
    data: {
      patientId: body.patient_id,
      visitId: body.visit_id,
      hospitalId,
      pharmacyId: body.pharmacy_id,
      diagnosis: body.diagnosis,
      notes: body.notes,
      insuranceProvider: body.insurance_provider,
      insuranceMember: body.insurance_member,
      prescribedBy: userId,
      status: body.pharmacy_id ? PrescriptionStatus.sent_to_pharmacy : PrescriptionStatus.pending,
      totalAmount,
      items: {
        create: items.map((item) => ({
          drugName: item.drug_name,
          genericName: item.generic_name,
          strength: item.strength,
          dose: item.dosage,
          quantity: item.quantity,
          frequency: item.frequency,
          durationDays: item.duration_days,
          unitPrice: item.unit_price ?? 0,
        })),
      },
    },
    include: { items: true },
  });

  await touchPatientData(body.patient_id);

  return {
    prescription_id: prescription.id,
    status: prescription.status,
    items: prescription.items,
  };
}

export async function createLabOrder(hospitalId: string, userId: string, body: LabOrderBody) {
  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: body.patient_id,
      visitId: body.visit_id,
      hospitalId,
      testName: body.test_name,
      testCode: body.test_code,
      orderedBy: userId,
      status: "ordered",
    },
  });

  await touchPatientData(body.patient_id);

  return {
    lab_order_id: labOrder.id,
    status: labOrder.status,
  };
}
