package medipass.app.auth.mapper;

import javax.annotation.processing.Generated;
import medipass.app.auth.dto.UserResponse;
import medipass.app.auth.entity.User;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-23T15:39:18+0200",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserResponse toUserResponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserResponse.UserResponseBuilder userResponse = UserResponse.builder();

        userResponse.id( user.getId() );
        userResponse.phoneNumber( user.getPhoneNumber() );

        userResponse.role( user.getRole().name() );
        userResponse.active( user.getIsActive() );

        return userResponse.build();
    }
}
