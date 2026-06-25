package medipass.app.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QRCodeResponse {

    // Base64-encoded PNG image of the QR code
    private String qrCode;
    private String generatedAt;
}
