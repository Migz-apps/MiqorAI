package medipass.app.patient.service;

import medipass.app.patient.dto.PatientResponse;
import medipass.app.patient.entity.Patient;
import medipass.app.patient.exception.PatientNotFoundException;
import medipass.app.patient.mapper.PatientMapper;
import medipass.app.patient.repository.PatientRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private PatientMapper patientMapper;
    @Mock
    private QRCodeService qrCodeService;

    @InjectMocks
    private PatientService patientService;

    @Test
    void getPatient_returnsMappedResponse() {
        UUID patientId = UUID.randomUUID();
        Patient patient = Patient.builder().id(patientId).isActive(true).build();
        PatientResponse response = PatientResponse.builder().id(patientId).active(true).build();

        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));
        when(patientMapper.toPatientResponse(patient)).thenReturn(response);

        PatientResponse result = patientService.getPatient(patientId);

        assertThat(result.getId()).isEqualTo(patientId);
        assertThat(result.getActive()).isTrue();
    }

    @Test
    void getPatient_throwsWhenInactive() {
        UUID patientId = UUID.randomUUID();
        Patient patient = Patient.builder().id(patientId).isActive(false).build();
        when(patientRepository.findById(patientId)).thenReturn(Optional.of(patient));

        assertThatThrownBy(() -> patientService.getPatient(patientId))
                .isInstanceOf(PatientNotFoundException.class);
    }
}
