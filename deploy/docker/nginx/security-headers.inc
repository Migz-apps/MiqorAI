# Security headers shared by every location of deploy/docker/nginx/portal.conf.
# Installed as /etc/nginx/templates/security-headers.inc.template and rendered to
# /etc/nginx/conf.d/security-headers.inc (the .inc suffix keeps it out of the
# default conf.d/*.conf http-level include). nginx drops inherited add_header
# directives in any location that sets its own, hence the per-location include.
#
# CSP notes:
# - connect-src: 'self' plus ${API_ORIGIN} (container env, e.g. https://api.miqorai.com).
# - style-src 'unsafe-inline': required; the bundles (sonner, Radix scroll lock)
#   inject <style> elements at runtime.
# - script-src 'self' only; ${CSP_SCRIPT_EXTRA} (empty by default) adds hashes for
#   any inline script a build emits. The QR scanner's worker is a bundled same-origin file.
# - Keep these values identical to the "headers" blocks in */vercel.json.

add_header Content-Security-Policy "default-src 'self'; script-src 'self'${CSP_SCRIPT_EXTRA}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${API_ORIGIN}; media-src 'self' blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
