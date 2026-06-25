package medipass.app.patient.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import medipass.app.patient.dto.RegisterPatientRequest;
import medipass.app.patient.entity.Gender;
import medipass.common.security.JwtTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PatientControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Test
    void registerAndRetrievePatient() throws Exception {
        String token = jwtTokenService.generateAccessToken("system@medipass.internal", "ADMIN");

        RegisterPatientRequest request = new RegisterPatientRequest();
        request.setFirstName("Amina");
        request.setLastName("Kamau");
        request.setGender(Gender.FEMALE);
        request.setPhoneNumber("+250788111222");
        request.setNationalId("1199887766554433");
        request.setDateOfBirth(LocalDate.of(1995, 4, 12));

        String body = mockMvc.perform(post("/api/v1/patients/register")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("Amina"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String patientId = objectMapper.readTree(body).path("data").path("id").asText();

        mockMvc.perform(get("/api/v1/patients/{id}", patientId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lastName").value("Kamau"));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/patients/search")
                        .param("query", "Amina"))
                .andExpect(status().isUnauthorized());
    }
}
