package medipass.app.medical.mapper;

import medipass.app.medical.dto.*;
import medipass.app.medical.entity.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MedicalMapper {

    @Mapping(target = "status", expression = "java(visit.getStatus().name())")
    VisitResponse toVisitResponse(Visit visit);

    HospitalResponse toHospitalResponse(Hospital hospital);

    DoctorResponse toDoctorResponse(Doctor doctor);

    DiagnosisResponse toDiagnosisResponse(Diagnosis diagnosis);

    @Mapping(target = "status", expression = "java(testResult.getStatus().name())")
    TestResultResponse toTestResultResponse(TestResult testResult);

    PrescriptionResponse toPrescriptionResponse(Prescription prescription);

    @Mapping(target = "severity", expression = "java(allergy.getSeverity().name())")
    AllergyResponse toAllergyResponse(Allergy allergy);
}
