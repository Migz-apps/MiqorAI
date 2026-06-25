package medipass.common.security;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) {
            return "****";
        }
        return phone.substring(0, Math.min(3, phone.length())) + "****"
                + phone.substring(phone.length() - 2);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "****";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return "**" + domain;
        }
        return local.charAt(0) + "****" + local.charAt(local.length() - 1) + domain;
    }

    public static String maskToken(String token) {
        if (token == null || token.length() < 8) {
            return "****";
        }
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }

    public static String maskNationalId(String nationalId) {
        if (nationalId == null || nationalId.length() < 4) {
            return "****";
        }
        return "****" + nationalId.substring(nationalId.length() - 4);
    }
}
