package medipass.app.medical.service;

import medipass.app.integration.PatientClient;
import medipass.app.integration.dto.PatientExistsResponse;
import medipass.app.medical.dto.CreateVisitRequest;
import medipass.app.medical.dto.VisitResponse;
import medipass.app.medical.entity.Visit;
import medipass.app.medical.exception.PatientNotFoundException;
import medipass.app.medical.mapper.MedicalMapper;
import medipass.app.medical.producer.MedicalEventProducer;
import medipass.app.medical.repository.VisitRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VisitServiceTest {

    @Mock
    private VisitRepository visitRepository;
    @Mock
    private PatientClient patientClient;
    @Mock
    private MedicalEventProducer eventProducer;
    @Mock
    private MedicalMapper medicalMapper;
    @Mock
    private HospitalService hospitalService;
    @Mock
    private DoctorService doctorService;
    @Mock
    private DiagnosisService diagnosisService;

    @InjectMocks
    private VisitService visitService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(visitService, "visitCreatedKey", "visit.created");
    }

    @Test
    void createVisit_throwsWhenPatientNotFound() {
        UUID patientId = UUID.randomUUID();
        CreateVisitRequest request = new CreateVisitRequest();
        request.setPatientId(patientId);
        request.setHospitalId(UUID.randomUUID());
        request.setDoctorId(UUID.randomUUID());
        request.setVisitReason("Checkup");

        PatientExistsResponse notFound = new PatientExistsResponse();
        notFound.setSuccess(false);
        when(patientClient.getPatient(patientId)).thenReturn(notFound);

        assertThatThrownBy(() -> visitService.createVisit(request))
                .isInstanceOf(PatientNotFoundException.class);

        verify(visitRepository, never()).save(any(Visit.class));
        verify(eventProducer, never()).publishEvent(any(), any());
    }

    @Test
    void createVisit_savesWhenPatientExists() {
        UUID patientId = UUID.randomUUID();
        UUID hospitalId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();
        CreateVisitRequest request = new CreateVisitRequest();
        request.setPatientId(patientId);
        request.setHospitalId(hospitalId);
        request.setDoctorId(doctorId);
        request.setVisitReason("Checkup");

        PatientExistsResponse.PatientData data = new PatientExistsResponse.PatientData();
        data.setId(patientId);
        data.setActive(true);
        PatientExistsResponse exists = new PatientExistsResponse();
        exists.setSuccess(true);
        exists.setData(data);

        Visit saved = Visit.builder()
                .id(UUID.randomUUID())
                .patientId(patientId)
                .hospitalId(hospitalId)
                .doctorId(doctorId)
                .build();
        VisitResponse response = VisitResponse.builder().id(saved.getId()).patientId(patientId).build();

        when(patientClient.getPatient(patientId)).thenReturn(exists);
        when(visitRepository.save(any(Visit.class))).thenReturn(saved);
        when(medicalMapper.toVisitResponse(saved)).thenReturn(response);

        visitService.createVisit(request);

        verify(hospitalService).validateHospitalActive(hospitalId);
        verify(doctorService).validateActiveDoctorBelongsToHospital(doctorId, hospitalId);
        verify(visitRepository).save(any(Visit.class));
        verify(eventProducer).publishEvent(any(), any());
    }
}
