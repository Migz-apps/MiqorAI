package medipass.app.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import medipass.app.auth.entity.Role;
import medipass.app.auth.entity.User;
import medipass.app.auth.exception.UserAlreadyExistsException;
import medipass.app.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User createUser(String phoneNumber, String rawPassword, Role role) {
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new UserAlreadyExistsException("Phone number already registered: " + phoneNumber);
        }

        User user = User.builder()
                .phoneNumber(phoneNumber)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(role)
                .isActive(true)
                .build();

        User saved = userRepository.save(user);
        log.info("New user created with id={}", saved.getId());
        return saved;
    }

    public Optional<User> findByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber);
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    @Transactional
    public void activateUser(UUID id) {
        userRepository.findById(id).ifPresent(user -> {
            user.setIsActive(true);
            userRepository.save(user);
            log.info("User {} activated", id);
        });
    }

    @Transactional
    public void deactivateUser(UUID id) {
        userRepository.findById(id).ifPresent(user -> {
            user.setIsActive(false);
            userRepository.save(user);
            log.info("User {} deactivated", id);
        });
    }
}
