import { SignJWT, importPKCS8 } from 'jose';

type GenerateArgs = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
};

// eslint-disable-next-line import/prefer-default-export
export const generateAppleClientSecret = async ({
  teamId,
  keyId,
  clientId,
  privateKey,
}: GenerateArgs): Promise<string> => {
  const alg = 'ES256';
  const now = Math.floor(Date.now() / 1000);
  const pkcs8 = await importPKCS8(privateKey, alg);

  return new SignJWT({})
    .setProtectedHeader({ alg, kid: keyId })
    .setIssuer(teamId) // Apple Team ID
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId) // Service ID
    .setIssuedAt(now)
    .setExpirationTime(now + 15777000) // ~6 months
    .sign(pkcs8);
};
