import { Request, Response } from "express";
import { requireAuth, requireRole } from "../auth.middleware";
import { signAccessToken } from "../../services/auth/jwt";

function buildRequest(cookies: Record<string, unknown> = {}): Request {
  return { cookies } as unknown as Request;
}

function buildResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("auth.middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: "segredo-de-teste" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("requireAuth", () => {
    it("popula req.user e chama next() quando o cookie tem um token válido", () => {
      const token = signAccessToken({ user_id: "user-1", role: "user" });
      const req = buildRequest({ access_token: token });
      const res = buildResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(req.user).toEqual({ id: "user-1", role: "user" });
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("retorna 401 quando não há cookie", () => {
      const req = buildRequest({});
      const res = buildResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("retorna 401 quando o token é inválido", () => {
      const req = buildRequest({ access_token: "token-invalido" });
      const res = buildResponse();
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("chama next() quando o perfil do usuário está na lista permitida", () => {
      const req = buildRequest();
      req.user = { id: "user-1", role: "rep" };
      const res = buildResponse();
      const next = jest.fn();

      requireRole("rep", "admin")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it.each(["user", "rep", "admin"] as const)(
      "aceita o perfil %s quando ele está na lista permitida",
      (role) => {
        const req = buildRequest();
        req.user = { id: "user-1", role };
        const res = buildResponse();
        const next = jest.fn();

        requireRole(role)(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
      }
    );

    it("retorna 403 quando o perfil não está na lista permitida", () => {
      const req = buildRequest();
      req.user = { id: "user-1", role: "user" };
      const res = buildResponse();
      const next = jest.fn();

      requireRole("rep", "admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("retorna 401 quando req.user não foi populado (requireAuth não rodou antes)", () => {
      const req = buildRequest();
      const res = buildResponse();
      const next = jest.fn();

      requireRole("admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
