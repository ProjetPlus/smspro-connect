-- Rotate the super-admin password to a random value to remove the previously
-- hardcoded credential. Recovery is via the /reset-password email flow.
UPDATE auth.users
SET encrypted_password = crypt(encode(gen_random_bytes(24), 'base64'), gen_salt('bf')),
    updated_at = now()
WHERE email = 'admin@smsmobilepro.com';