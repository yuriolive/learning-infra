import { describe, it, expect } from "vitest";

import { isPrivateIp, resolveIps } from "./network";

describe("network utilities", () => {
  describe("isPrivateIp", () => {
    it("should identify private IPv4 addresses", () => {
      expect(isPrivateIp("127.0.0.1")).toBe(true);
      expect(isPrivateIp("10.0.0.1")).toBe(true);
      expect(isPrivateIp("172.16.0.1")).toBe(true);
      expect(isPrivateIp("172.31.255.255")).toBe(true);
      expect(isPrivateIp("192.168.1.1")).toBe(true);
      expect(isPrivateIp("169.254.1.1")).toBe(true);
      expect(isPrivateIp("0.0.0.0")).toBe(true);
    });

    it("should identify public IPv4 addresses", () => {
      expect(isPrivateIp("8.8.8.8")).toBe(false);
      expect(isPrivateIp("1.1.1.1")).toBe(false);
      expect(isPrivateIp("172.15.255.255")).toBe(false);
      expect(isPrivateIp("172.32.0.0")).toBe(false);
    });

    it("should identify private IPv6 addresses", () => {
      expect(isPrivateIp("::1")).toBe(true);
      expect(isPrivateIp("::")).toBe(true);
      expect(isPrivateIp("fc00::")).toBe(true);
      expect(isPrivateIp("fd00::")).toBe(true);
      expect(isPrivateIp("fe80::")).toBe(true);
    });

    it("should identify public IPv6 addresses", () => {
      expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
    });

    it("should treat invalid IPs as private (safe default)", () => {
      expect(isPrivateIp("not-an-ip")).toBe(true);
      expect(isPrivateIp("127.0.0")).toBe(true);
    });
  });

  describe("resolveIps", () => {
    it("should return the IP directly if input is an IP", async () => {
      const ips = await resolveIps("1.1.1.1");
      expect(ips).toEqual(["1.1.1.1"]);
    });

    it("should resolve a hostname to IPs", async () => {
      // We don't want to rely on external network if possible,
      // but resolveIps uses dns.resolve which we can't easily mock here without more setup
      // For now, testing with a known public domain or just checking it returns an array
      const ips = await resolveIps("google.com");
      expect(ips.length).toBeGreaterThan(0);
      expect(ips.every((ip) => !isPrivateIp(ip))).toBe(true);
    });

    it("should return empty array for non-existent domains", async () => {
      const ips = await resolveIps("non-existent-domain-123456789.com");
      expect(ips).toEqual([]);
    });
  });
});
