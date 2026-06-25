package medipass.app.medical.mapper;

import javax.annotation.processing.Generated;
import medipass.app.medical.dto.AllergyResponse;
import medipass.app.medical.dto.DiagnosisResponse;
import medipass.app.medical.dto.DoctorResponse;
import medipass.app.medical.dto.HospitalResponse;
import medipass.app.medical.dto.PrescriptionResponse;
import medipass.app.medical.dto.TestResultResponse;
import medipass.app.medical.dto.VisitResponse;
import medipass.app.medical.entity.Allergy;
import medipass.app.medical.entity.Diagnosis;
import medipass.app.medical.entity.Doctor;
import medipass.app.medical.entity.Hospital;
import medipass.app.medical.entity.Prescription;
import medipass.app.medical.entity.TestResult;
import medipass.app.medical.entity.Visit;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-23T15:39:51+0200",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class MedicalMapperImpl implements MedicalMapper {

    @Override
    public VisitResponse toVisitResponse(Visit visit) {
        if ( visit == null ) {
            return null;
        }

        VisitResponse.VisitResponseBuilder visitResponse = VisitResponse.builder();

        visitResponse.createdAt( visit.getCreatedAt() );
        visitResponse.diagnosis( visit.getDiagnosis() );
        visitResponse.doctorId( visit.getDoctorId() );
        visitResponse.hospitalId( visit.getHospitalId() );
        visitResponse.id( visit.getId() );
        visitResponse.notes( visit.getNotes() );
        visitResponse.patientId( visit.getPatientId() );
        visitResponse.visitDate( visit.getVisitDate() );
        visitResponse.visitReason( visit.getVisitReason() );

        visitResponse.status( visit.getStatus().name() );

        return visitResponse.build();
    }

    @Override
    public HospitalResponse toHospitalResponse(Hospital hospital) {
        if ( hospital == null ) {
            return null;
        }

        HospitalResponse.HospitalResponseBuilder hospitalResponse = HospitalResponse.builder();

        hospitalResponse.address( hospital.getAddress() );
        hospitalResponse.createdAt( hospital.getCreatedAt() );
        hospitalResponse.district( hospital.getDistrict() );
        hospitalResponse.email( hospital.getEmail() );
        hospitalResponse.hospitalCode( hospital.getHospitalCode() );
        hospitalResponse.hospitalName( hospital.getHospitalName() );
        hospitalResponse.id( hospital.getId() );
        hospitalResponse.isActive( hospital.getIsActive() );
        hospitalResponse.phoneNumber( hospital.getPhoneNumber() );
        hospitalResponse.sector( hospital.getSector() );
        hospitalResponse.updatedAt( hospital.getUpdatedAt() );

        return hospitalResponse.build();
    }

    @Override
    public DoctorResponse toDoctorResponse(Doctor doctor) {
        if ( doctor == null ) {
            return null;
        }

        DoctorResponse.DoctorResponseBuilder doctorResponse = DoctorResponse.builder();

        doctorResponse.createdAt( doctor.getCreatedAt() );
        doctorResponse.email( doctor.getEmail() );
        doctorResponse.firstName( doctor.getFirstName() );
        doctorResponse.hospitalId( doctor.getHospitalId() );
        doctorResponse.id( doctor.getId() );
        doctorResponse.isActive( doctor.getIsActive() );
        doctorResponse.lastName( doctor.getLastName() );
        doctorResponse.licenseNumber( doctor.getLicenseNumber() );
        doctorResponse.phoneNumber( doctor.getPhoneNumber() );
        doctorResponse.specialization( doctor.getSpecialization() );

        return doctorResponse.build();
    }

    @Override
    public DiagnosisResponse toDiagnosisResponse(Diagnosis diagnosis) {
        if ( diagnosis == null ) {
            return null;
        }

        DiagnosisResponse.DiagnosisResponseBuilder diagnosisResponse = DiagnosisResponse.builder();

        diagnosisResponse.diagnosedAt( diagnosis.getDiagnosedAt() );
        diagnosisResponse.diagnosisName( diagnosis.getDiagnosisName() );
        diagnosisResponse.diagnosisNotes( diagnosis.getDiagnosisNotes() );
        diagnosisResponse.doctorId( diagnosis.getDoctorId() );
        diagnosisResponse.id( diagnosis.getId() );
        diagnosisResponse.visitId( diagnosis.getVisitId() );

        return diagnosisResponse.build();
    }

    @Override
    public TestResultResponse toTestResultResponse(TestResult testResult) {
        if ( testResult == null ) {
            return null;
        }

        TestResultResponse.TestResultResponseBuilder testResultResponse = TestResultResponse.builder();

        testResultResponse.createdAt( testResult.getCreatedAt() );
        testResultResponse.doctorId( testResult.getDoctorId() );
        testResultResponse.hospitalId( testResult.getHospitalId() );
        testResultResponse.id( testResult.getId() );
        testResultResponse.referenceRange( testResult.getReferenceRange() );
        testResultResponse.result( testResult.getResult() );
        testResultResponse.testName( testResult.getTestName() );
        testResultResponse.unit( testResult.getUnit() );
        testResultResponse.visitId( testResult.getVisitId() );

        testResultResponse.status( testResult.getStatus().name() );

        return testResultResponse.build();
    }

    @Override
    public PrescriptionResponse toPrescriptionResponse(Prescription prescription) {
        if ( prescription == null ) {
            return null;
        }

        PrescriptionResponse.PrescriptionResponseBuilder prescriptionResponse = PrescriptionResponse.builder();

        prescriptionResponse.createdAt( prescription.getCreatedAt() );
        prescriptionResponse.doctorId( prescription.getDoctorId() );
        prescriptionResponse.dosage( prescription.getDosage() );
        prescriptionResponse.duration( prescription.getDuration() );
        prescriptionResponse.frequency( prescription.getFrequency() );
        prescriptionResponse.hospitalId( prescription.getHospitalId() );
        prescriptionResponse.id( prescription.getId() );
        prescriptionResponse.instructions( prescription.getInstructions() );
        prescriptionResponse.medicationName( prescription.getMedicationName() );
        prescriptionResponse.visitId( prescription.getVisitId() );

        return prescriptionResponse.build();
    }

    @Override
    public AllergyResponse toAllergyResponse(Allergy allergy) {
        if ( allergy == null ) {
            return null;
        }

        AllergyResponse.AllergyResponseBuilder allergyResponse = AllergyResponse.builder();

        allergyResponse.allergyName( allergy.getAllergyName() );
        allergyResponse.id( allergy.getId() );
        allergyResponse.patientId( allergy.getPatientId() );
        allergyResponse.reaction( allergy.getReaction() );
        allergyResponse.recordedAt( allergy.getRecordedAt() );

        allergyResponse.severity( allergy.getSeverity().name() );

        return allergyResponse.build();
    }
}
