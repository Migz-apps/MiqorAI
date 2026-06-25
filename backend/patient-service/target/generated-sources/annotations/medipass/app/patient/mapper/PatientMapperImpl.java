package medipass.app.patient.mapper;

import javax.annotation.processing.Generated;
import medipass.app.patient.dto.EmergencyContactResponse;
import medipass.app.patient.dto.PatientResponse;
import medipass.app.patient.entity.EmergencyContact;
import medipass.app.patient.entity.Patient;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-23T15:40:09+0200",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class PatientMapperImpl implements PatientMapper {

    @Override
    public PatientResponse toPatientResponse(Patient patient) {
        if ( patient == null ) {
            return null;
        }

        PatientResponse.PatientResponseBuilder patientResponse = PatientResponse.builder();

        patientResponse.bloodGroup( patient.getBloodGroup() );
        patientResponse.createdAt( patient.getCreatedAt() );
        patientResponse.dateOfBirth( patient.getDateOfBirth() );
        patientResponse.firstName( patient.getFirstName() );
        patientResponse.id( patient.getId() );
        patientResponse.lastName( patient.getLastName() );
        patientResponse.nationalId( patient.getNationalId() );
        patientResponse.phoneNumber( patient.getPhoneNumber() );
        patientResponse.profilePictureUrl( patient.getProfilePictureUrl() );
        patientResponse.updatedAt( patient.getUpdatedAt() );

        patientResponse.gender( patient.getGender().name() );
        patientResponse.maritalStatus( patient.getMaritalStatus() != null ? patient.getMaritalStatus().name() : null );
        patientResponse.active( patient.getIsActive() );

        return patientResponse.build();
    }

    @Override
    public EmergencyContactResponse toEmergencyContactResponse(EmergencyContact contact) {
        if ( contact == null ) {
            return null;
        }

        EmergencyContactResponse.EmergencyContactResponseBuilder emergencyContactResponse = EmergencyContactResponse.builder();

        emergencyContactResponse.createdAt( contact.getCreatedAt() );
        emergencyContactResponse.fullName( contact.getFullName() );
        emergencyContactResponse.id( contact.getId() );
        emergencyContactResponse.patientId( contact.getPatientId() );
        emergencyContactResponse.phoneNumber( contact.getPhoneNumber() );
        emergencyContactResponse.relationship( contact.getRelationship() );

        return emergencyContactResponse.build();
    }
}
