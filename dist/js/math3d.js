// PrismVista 3D Math Engine (Offline Self-Contained)
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x; this.y = y; this.z = z;
        return this;
    }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() {
        const len = this.length();
        if (len > 0.000001) {
            this.x /= len; this.y /= len; this.z /= len;
        }
        return this;
    }
    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }
    transformMat4(m) {
        const x = this.x, y = this.y, z = this.z;
        const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1.0;
        this.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        this.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        this.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
        return this;
    }
    transformDirection(m) {
        const x = this.x, y = this.y, z = this.z;
        this.x = m[0] * x + m[4] * y + m[8] * z;
        this.y = m[1] * x + m[5] * y + m[9] * z;
        this.z = m[2] * x + m[6] * y + m[10] * z;
        return this.normalize();
    }
}

class Mat4 {
    static create() {
        const out = new Float32Array(16);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
    }
    static identity(out) {
        out.fill(0);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
    }
    static multiply(out, a, b) {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    }
    static perspective(out, fovyRad, aspect, near, far) {
        const f = 1.0 / Math.tan(fovyRad / 2);
        const nf = 1 / (near - far);
        out.fill(0);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = 2 * far * near * nf;
        return out;
    }
    static lookAt(out, eye, target, up) {
        let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
        let eyex = eye.x, eyey = eye.y, eyez = eye.z;
        let upx = up.x, upy = up.y, upz = up.z;
        let targetx = target.x, targety = target.y, targetz = target.z;

        z0 = eyex - targetx;
        z1 = eyey - targety;
        z2 = eyez - targetz;
        len = Math.hypot(z0, z1, z2);
        if (len === 0) z2 = 1; else { z0 /= len; z1 /= len; z2 /= len; }

        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.hypot(x0, x1, x2);
        if (len === 0) { x0 = 0; x1 = 0; x2 = 0; } else { x0 /= len; x1 /= len; x2 /= len; }

        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;
        len = Math.hypot(y0, y1, y2);
        if (len === 0) { y0 = 0; y1 = 0; y2 = 0; } else { y0 /= len; y1 /= len; y2 /= len; }

        out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
        out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
        out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
        out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        out[15] = 1;
        return out;
    }
    static compose(out, pos, rotDeg, scale) {
        Mat4.identity(out);
        const radX = rotDeg.x * Math.PI / 180;
        const radY = rotDeg.y * Math.PI / 180;
        const radZ = rotDeg.z * Math.PI / 180;

        const sX = Math.sin(radX), cX = Math.cos(radX);
        const sY = Math.sin(radY), cY = Math.cos(radY);
        const sZ = Math.sin(radZ), cZ = Math.cos(radZ);

        out[0] = (cY * cZ) * scale.x;
        out[1] = (cY * sZ) * scale.x;
        out[2] = (-sY) * scale.x;
        out[3] = 0;

        out[4] = (sX * sY * cZ - cX * sZ) * scale.y;
        out[5] = (sX * sY * sZ + cX * cZ) * scale.y;
        out[6] = (sX * cY) * scale.y;
        out[7] = 0;

        out[8] = (cX * sY * cZ + sX * sZ) * scale.z;
        out[9] = (cX * sY * sZ - sX * cZ) * scale.z;
        out[10] = (cX * cY) * scale.z;
        out[11] = 0;

        out[12] = pos.x;
        out[13] = pos.y;
        out[14] = pos.z;
        out[15] = 1;
        return out;
    }
    static invert(out, a) {
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;

        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det) return null;
        det = 1.0 / det;

        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
        return out;
    }
}

class Ray3 {
    constructor(origin, direction) {
        this.origin = origin ? origin.clone() : new Vec3();
        this.direction = direction ? direction.clone().normalize() : new Vec3(0, 0, -1);
    }
    static fromScreen(screenX, screenY, screenW, screenH, invViewProj) {
        const ndcX = (screenX / screenW) * 2 - 1;
        const ndcY = 1 - (screenY / screenH) * 2;

        const pNear = new Vec3(ndcX, ndcY, -1.0).transformMat4(invViewProj);
        const pFar = new Vec3(ndcX, ndcY, 1.0).transformMat4(invViewProj);
        const dir = pFar.clone().sub(pNear).normalize();
        return new Ray3(pNear, dir);
    }
    intersectBox(min, max) {
        let tmin = (min.x - this.origin.x) / (this.direction.x || 0.000001);
        let tmax = (max.x - this.origin.x) / (this.direction.x || 0.000001);
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

        let tymin = (min.y - this.origin.y) / (this.direction.y || 0.000001);
        let tymax = (max.y - this.origin.y) / (this.direction.y || 0.000001);
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

        if (tmin > tymax || tymin > tmax) return null;
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;

        let tzmin = (min.z - this.origin.z) / (this.direction.z || 0.000001);
        let tzmax = (max.z - this.origin.z) / (this.direction.z || 0.000001);
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

        if (tmin > tzmax || tzmin > tmax) return null;
        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;

        return tmin >= 0 ? tmin : (tmax >= 0 ? tmax : null);
    }
}

