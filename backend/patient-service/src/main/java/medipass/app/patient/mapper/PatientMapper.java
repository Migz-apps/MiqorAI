package medipass.app.patient.mapper;

import medipass.app.patient.dto.EmergencyContactResponse;
import medipass.app.patient.dto.PatientResponse;
import medipass.app.patient.entity.EmergencyContact;
import medipass.app.patient.entity.Patient;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PatientMapper {

    @Mapping(target = "gender", expression = "java(patient.getGender().name())")
    @Mapping(target = "maritalStatus", expression = "java(patient.getMaritalStatus() != null ? patient.getMaritalStatus().name() : null)")
    @Mapping(target = "active", expression = "java(patient.getIsActive())")
    PatientResponse toPatientResponse(Patient patient);

    EmergencyContactResponse toEmergencyContactResponse(EmergencyContact contact);
}
