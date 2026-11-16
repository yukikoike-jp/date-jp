import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./pushClient";

describe("urlBase64ToUint8Array", () => {
  it("URL で安全な base64 を、数の並びに直す(- と _ も読める)", () => {
    // "Hello?>" = SGVsbG8_Pg(= なし、_ を含む)
    expect(Array.from(urlBase64ToUint8Array("SGVsbG8_Pg"))).toEqual([72, 101, 108, 108, 111, 63, 62]);
  });
  it("VAPID の公開鍵(65バイト)の長さになる", () => {
    const key = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
    expect(urlBase64ToUint8Array(key)).toHaveLength(65);
  });
});
