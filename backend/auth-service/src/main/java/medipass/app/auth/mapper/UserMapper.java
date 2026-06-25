package medipass.app.auth.mapper;

import medipass.app.auth.dto.UserResponse;
import medipass.app.auth.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "role", expression = "java(user.getRole().name())")
    @Mapping(target = "active", expression = "java(user.getIsActive())")
    UserResponse toUserResponse(User user);
}
