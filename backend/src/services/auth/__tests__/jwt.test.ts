import jwt from "jsonwebtoken";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../jwt";

describe("jwt", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "segredo-de-teste-access",
      JWT_REFRESH_SECRET: "segredo-de-teste-refresh",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("assina e verifica um access token com o payload correto (RFC §6.2)", () => {
    const token = signAccessToken({ user_id: "user-1", role: "user" });
    const decoded = verifyAccessToken(token);

    expect(decoded.user_id).toBe("user-1");
    expect(decoded.role).toBe("user");
    expect(decoded.iat).toEqual(expect.any(Number));
    expect(decoded.exp).toEqual(expect.any(Number));
  });

  it("assina e verifica um refresh token", () => {
    const token = signRefreshToken({ user_id: "user-1", role: "rep" });
    const decoded = verifyRefreshToken(token);

    expect(decoded.user_id).toBe("user-1");
    expect(decoded.role).toBe("rep");
  });

  it("rejeita um access token assinado com outro segredo", () => {
    const tokenComOutroSegredo = jwt.sign(
      { user_id: "user-1", role: "user" },
      "segredo-errado",
      { algorithm: "HS256", expiresIn: "8h" }
    );

    expect(() => verifyAccessToken(tokenComOutroSegredo)).toThrow();
  });

  it("rejeita um token expirado", () => {
    const tokenExpirado = jwt.sign(
      { user_id: "user-1", role: "user" },
      "segredo-de-teste-access",
      { algorithm: "HS256", expiresIn: -1 }
    );

    expect(() => verifyAccessToken(tokenExpirado)).toThrow();
  });

  it("lança erro claro quando JWT_SECRET não está configurado", () => {
    delete process.env.JWT_SECRET;

    expect(() => signAccessToken({ user_id: "user-1", role: "user" })).toThrow(
      "JWT_SECRET não configurado."
    );
  });
});
