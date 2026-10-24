// PrismVista 3D - WebGL PBR Real-time Rendering Engine
class Engine3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, alpha: false }) ||
                  canvas.getContext('experimental-webgl', { antialias: true, preserveDrawingBuffer: true, alpha: false });
        if (!this.gl) {
            alert('WebGL is not supported in this environment.');
            return;
        }

        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        this.initShaders();
        this.initSkyShader();

        // Environment & Lighting Parameters (PrismVista Defaults)
        this.environment = {
            sunAltitude: 42,      // degrees (0 to 90)
            sunAzimuth: 135,      // degrees (0 to 360)
            sunIntensity: 1.6,
            sunColor: [1.0, 0.96, 0.90],
            ambientIntensity: 0.45,
            ambientColor: [0.65, 0.75, 0.90],
            fogDensity: 0.003,
            fogColor: [0.72, 0.80, 0.92],
            preset: 'midday'
        };

        // Camera & Post-Processing
        this.postProcess = {
            fov: 55,
            exposure: 1.1,
            bloom: 0.35,
            contrast: 1.05,
            saturation: 1.05,
            vignette: 0.25,
            toneMapping: 'aces' // aces, reinhard, linear
        };

        this.pointLights = [
            { pos: new Vec3(0, 4.5, 0), color: [1.0, 0.85, 0.6], intensity: 2.2, radius: 18 },
            { pos: new Vec3(-6, 1.2, 5), color: [0.3, 0.7, 1.0], intensity: 1.8, radius: 12 }
        ];

        this.cachedBuffers = new Map();
    }

    initShaders() {
        const gl = this.gl;

        const vsSource = `
            attribute vec3 aPosition;
            attribute vec3 aNormal;
            attribute vec2 aUV;

            uniform mat4 uModel;
            uniform mat4 uView;
            uniform mat4 uProjection;
            uniform mat4 uNormalMatrix;

            varying vec3 vWorldPos;
            varying vec3 vNormal;
            varying vec2 vUV;

            void main() {
                vec4 worldPos = uModel * vec4(aPosition, 1.0);
                vWorldPos = worldPos.xyz;
                vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
                vUV = aUV;
                gl_Position = uProjection * uView * worldPos;
            }
        `;

        const fsSource = `
            precision highp float;

            varying vec3 vWorldPos;
            varying vec3 vNormal;
            varying vec2 vUV;

            uniform vec3 uCameraPos;
            uniform vec3 uSunDir;
            uniform vec3 uSunColor;
            uniform float uSunIntensity;
            uniform vec3 uAmbientColor;
            uniform float uAmbientIntensity;

            // Material Uniforms
            uniform vec3 uAlbedo;
            uniform float uRoughness;
            uniform float uMetallic;
            uniform vec3 uEmissive;
            uniform float uOpacity;
            uniform float uSelected;

            // Fog & Tone Mapping
            uniform float uFogDensity;
            uniform vec3 uFogColor;
            uniform float uExposure;
            uniform float uBloom;
            uniform float uContrast;
            uniform float uSaturation;
            uniform int uToneMapping;

            // Point Lights
            struct PointLight {
                vec3 pos;
                vec3 color;
                float intensity;
                float radius;
            };
            uniform PointLight uPointLights[2];

            const float PI = 3.14159265359;

            // GGX Distribution
            float DistributionGGX(vec3 N, vec3 H, float roughness) {
                float a = roughness * roughness;
                float a2 = a * a;
                float NdotH = max(dot(N, H), 0.0);
                float NdotH2 = NdotH * NdotH;
                float nom   = a2;
                float denom = (NdotH2 * (a2 - 1.0) + 1.0);
                denom = PI * denom * denom;
                return nom / max(denom, 0.0001);
            }

            // Geometry Schlick-GGX
            float GeometrySchlickGGX(float NdotV, float roughness) {
                float r = (roughness + 1.0);
                float k = (r * r) / 8.0;
                float nom   = NdotV;
                float denom = NdotV * (1.0 - k) + k;
                return nom / denom;
            }

            float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
                float NdotV = max(dot(N, V), 0.0);
                float NdotL = max(dot(N, L), 0.0);
                float ggx2 = GeometrySchlickGGX(NdotV, roughness);
                float ggx1 = GeometrySchlickGGX(NdotL, roughness);
                return ggx1 * ggx2;
            }

            // Fresnel Schlick
            vec3 fresnelSchlick(float cosTheta, vec3 F0) {
                return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
            }

            // ACES Filmic Tone Mapping Curve
            vec3 ACESFilm(vec3 x) {
                float a = 2.51;
                float b = 0.03;
                float c = 2.43;
                float d = 0.59;
                float e = 0.14;
                return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
            }

            void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(uCameraPos - vWorldPos);

                vec3 F0 = vec3(0.04);
                F0 = mix(F0, uAlbedo, uMetallic);

                // Direct Sun Light
                vec3 L = normalize(uSunDir);
                vec3 H = normalize(V + L);
                float NdotL = max(dot(N, L), 0.0);

                // Cook-Torrance BRDF
                float NDF = DistributionGGX(N, H, max(uRoughness, 0.04));
                float G   = GeometrySmith(N, V, L, max(uRoughness, 0.04));
                vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);

                vec3 numerator    = NDF * G * F;
                float denominator = 4.0 * max(dot(N, V), 0.0) * NdotL + 0.0001;
                vec3 specular     = numerator / denominator;

                vec3 kS = F;
                vec3 kD = vec3(1.0) - kS;
                kD *= 1.0 - uMetallic;

                vec3 radiance = uSunColor * uSunIntensity;
                vec3 Lo = (kD * uAlbedo / PI + specular) * radiance * NdotL;

                // Point Lights Contribution
                for (int i = 0; i < 2; i++) {
                    vec3 pL = uPointLights[i].pos - vWorldPos;
                    float dist = length(pL);
                    pL = normalize(pL);
                    vec3 pH = normalize(V + pL);
                    float pNdotL = max(dot(N, pL), 0.0);

                    float attenuation = clamp(1.0 - (dist / uPointLights[i].radius), 0.0, 1.0);
                    attenuation *= attenuation;

                    vec3 pRadiance = uPointLights[i].color * uPointLights[i].intensity * attenuation;
                    float pNDF = DistributionGGX(N, pH, max(uRoughness, 0.04));
                    float pG   = GeometrySmith(N, V, pL, max(uRoughness, 0.04));
                    vec3 pF    = fresnelSchlick(max(dot(pH, V), 0.0), F0);

                    vec3 pSpec = (pNDF * pG * pF) / (4.0 * max(dot(N, V), 0.0) * pNdotL + 0.0001);
                    vec3 pkD = (vec3(1.0) - pF) * (1.0 - uMetallic);
                    Lo += (pkD * uAlbedo / PI + pSpec) * pRadiance * pNdotL;
                }

                // Ambient & Sky reflection
                vec3 ambient = uAmbientColor * uAmbientIntensity * uAlbedo;
                vec3 color = ambient + Lo + uEmissive;

                // Fog
                float dist = length(uCameraPos - vWorldPos);
                float fogFactor = 1.0 - exp(-dist * uFogDensity);
                color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

                // Selection Highlight outline glow
                if (uSelected > 0.5) {
                    float edge = 1.0 - max(dot(N, V), 0.0);
                    color += vec3(0.1, 0.5, 1.0) * pow(edge, 3.0) * 2.0;
                }

                // Post-Processing: Exposure & Tone Mapping
                color *= uExposure;

                // Subtle Bloom simulation on high dynamic range peaks
                vec3 bloomGlow = max(color - vec3(1.0), vec3(0.0)) * uBloom;
                color += bloomGlow;

                if (uToneMapping == 1) {
                    color = ACESFilm(color);
                } else if (uToneMapping == 2) {
                    color = color / (color + vec3(1.0)); // Reinhard
                }

                // Contrast & Saturation
                color = mix(vec3(0.5), color, uContrast);
                float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
                color = mix(vec3(luminance), color, uSaturation);

                gl_FragColor = vec4(color, uOpacity);
            }
        `;

        this.program = this.createProgram(vsSource, fsSource);
        this.attribs = {
            position: gl.getAttribLocation(this.program, 'aPosition'),
            normal: gl.getAttribLocation(this.program, 'aNormal'),
            uv: gl.getAttribLocation(this.program, 'aUV')
        };
        this.uniforms = {
            uModel: gl.getUniformLocation(this.program, 'uModel'),
            uView: gl.getUniformLocation(this.program, 'uView'),
            uProjection: gl.getUniformLocation(this.program, 'uProjection'),
            uNormalMatrix: gl.getUniformLocation(this.program, 'uNormalMatrix'),
            uCameraPos: gl.getUniformLocation(this.program, 'uCameraPos'),
            uSunDir: gl.getUniformLocation(this.program, 'uSunDir'),
            uSunColor: gl.getUniformLocation(this.program, 'uSunColor'),
            uSunIntensity: gl.getUniformLocation(this.program, 'uSunIntensity'),
            uAmbientColor: gl.getUniformLocation(this.program, 'uAmbientColor'),
            uAmbientIntensity: gl.getUniformLocation(this.program, 'uAmbientIntensity'),
            uAlbedo: gl.getUniformLocation(this.program, 'uAlbedo'),
            uRoughness: gl.getUniformLocation(this.program, 'uRoughness'),
            uMetallic: gl.getUniformLocation(this.program, 'uMetallic'),
            uEmissive: gl.getUniformLocation(this.program, 'uEmissive'),
            uOpacity: gl.getUniformLocation(this.program, 'uOpacity'),
            uSelected: gl.getUniformLocation(this.program, 'uSelected'),
            uFogDensity: gl.getUniformLocation(this.program, 'uFogDensity'),
            uFogColor: gl.getUniformLocation(this.program, 'uFogColor'),
            uExposure: gl.getUniformLocation(this.program, 'uExposure'),
            uBloom: gl.getUniformLocation(this.program, 'uBloom'),
            uContrast: gl.getUniformLocation(this.program, 'uContrast'),
            uSaturation: gl.getUniformLocation(this.program, 'uSaturation'),
            uToneMapping: gl.getUniformLocation(this.program, 'uToneMapping')
        };
    }

    initSkyShader() {
        const gl = this.gl;
        const vsSky = `
            attribute vec2 aPos;
            varying vec2 vUV;
            void main() {
                vUV = aPos * 0.5 + 0.5;
                gl_Position = vec4(aPos, 0.9999, 1.0);
            }
        `;
        const fsSky = `
            precision highp float;
            varying vec2 vUV;
            uniform vec3 uSkyTop;
            uniform vec3 uSkyBottom;
            uniform vec3 uSunDir;
            uniform vec3 uSunColor;

            void main() {
                float t = vUV.y;
                vec3 sky = mix(uSkyBottom, uSkyTop, t);
                gl_FragColor = vec4(sky, 1.0);
            }
        `;
        this.skyProgram = this.createProgram(vsSky, fsSky);
        this.skyAttrib = gl.getAttribLocation(this.skyProgram, 'aPos');
        this.skyUniforms = {
            uSkyTop: gl.getUniformLocation(this.skyProgram, 'uSkyTop'),
            uSkyBottom: gl.getUniformLocation(this.skyProgram, 'uSkyBottom'),
            uSunDir: gl.getUniformLocation(this.skyProgram, 'uSunDir'),
            uSunColor: gl.getUniformLocation(this.skyProgram, 'uSunColor')
        };

        const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        this.skyBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    }

    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex Shader Error:', gl.getShaderInfoLog(vs));
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment Shader Error:', gl.getShaderInfoLog(fs));
        }

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        return program;
    }

    getSunVector() {
        const altRad = this.environment.sunAltitude * Math.PI / 180;
        const azRad = this.environment.sunAzimuth * Math.PI / 180;
        const y = Math.sin(altRad);
        const cosAlt = Math.cos(altRad);
        const x = cosAlt * Math.sin(azRad);
        const z = cosAlt * Math.cos(azRad);
        return new Vec3(x, y, z).normalize();
    }

    getSkyColors() {
        const alt = this.environment.sunAltitude;
        if (alt < 10) {
            // Sunset / Golden Hour
            return {
                top: [0.15, 0.22, 0.40],
                bottom: [0.95, 0.48, 0.22],
                sun: [1.0, 0.65, 0.35],
                fog: [0.65, 0.40, 0.35]
            };
        } else if (alt < 30) {
            // Morning / Afternoon
            return {
                top: [0.25, 0.45, 0.85],
                bottom: [0.85, 0.75, 0.65],
                sun: [1.0, 0.90, 0.75],
                fog: [0.75, 0.75, 0.82]
            };
        } else {
            // Bright Clear Midday
            return {
                top: [0.20, 0.45, 0.90],
                bottom: [0.72, 0.82, 0.95],
                sun: [1.0, 0.98, 0.92],
                fog: [0.72, 0.80, 0.92]
            };
        }
    }

    renderSky() {
        const gl = this.gl;
        const skyColors = this.getSkyColors();
        gl.useProgram(this.skyProgram);
        gl.disable(gl.DEPTH_TEST);

        gl.uniform3fv(this.skyUniforms.uSkyTop, skyColors.top);
        gl.uniform3fv(this.skyUniforms.uSkyBottom, skyColors.bottom);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
        gl.enableVertexAttribArray(this.skyAttrib);
        gl.vertexAttribPointer(this.skyAttrib, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    getMeshBuffers(mesh) {
        if (this.cachedBuffers.has(mesh)) {
            return this.cachedBuffers.get(mesh);
        }
        const gl = this.gl;
        const vPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.positions, gl.STATIC_DRAW);

        const vNormBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vNormBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.normals, gl.STATIC_DRAW);

        const vUvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vUvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.geometry.uvs, gl.STATIC_DRAW);

        const vIdxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIdxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.geometry.indices, gl.STATIC_DRAW);

        const buffers = {
            pos: vPosBuf,
            norm: vNormBuf,
            uv: vUvBuf,
            idx: vIdxBuf,
            count: mesh.geometry.indices.length
        };
        this.cachedBuffers.set(mesh, buffers);
        return buffers;
    }

    renderScene(scene, camera, selectedId = null) {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.12, 0.14, 0.18, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Sky background
        this.renderSky();

        // Main PBR render pass
        gl.useProgram(this.program);

        const aspect = this.canvas.width / this.canvas.height;
        const proj = Mat4.create();
        Mat4.perspective(proj, (this.postProcess.fov * Math.PI) / 180, aspect, 0.1, 500.0);

        const view = Mat4.create();
        Mat4.lookAt(view, camera.position, camera.target, new Vec3(0, 1, 0));

        gl.uniformMatrix4fv(this.uniforms.uProjection, false, proj);
        gl.uniformMatrix4fv(this.uniforms.uView, false, view);
        gl.uniform3f(this.uniforms.uCameraPos, camera.position.x, camera.position.y, camera.position.z);

        const sunDir = this.getSunVector();
        const skyColors = this.getSkyColors();
        gl.uniform3f(this.uniforms.uSunDir, sunDir.x, sunDir.y, sunDir.z);
        gl.uniform3fv(this.uniforms.uSunColor, skyColors.sun);
        gl.uniform1f(this.uniforms.uSunIntensity, this.environment.sunIntensity);

        gl.uniform3fv(this.uniforms.uAmbientColor, this.environment.ambientColor);
        gl.uniform1f(this.uniforms.uAmbientIntensity, this.environment.ambientIntensity);

        gl.uniform1f(this.uniforms.uFogDensity, this.environment.fogDensity);
        gl.uniform3fv(this.uniforms.uFogColor, skyColors.fog);

        gl.uniform1f(this.uniforms.uExposure, this.postProcess.exposure);
        gl.uniform1f(this.uniforms.uBloom, this.postProcess.bloom);
        gl.uniform1f(this.uniforms.uContrast, this.postProcess.contrast);
        gl.uniform1f(this.uniforms.uSaturation, this.postProcess.saturation);

        let tmVal = 1;
        if (this.postProcess.toneMapping === 'reinhard') tmVal = 2;
        else if (this.postProcess.toneMapping === 'linear') tmVal = 0;
        gl.uniform1i(this.uniforms.uToneMapping, tmVal);

        // Bind Point Lights
        for (let i = 0; i < 2; i++) {
            const p = this.pointLights[i];
            const pLoc = gl.getUniformLocation(this.program, `uPointLights[${i}].pos`);
            const cLoc = gl.getUniformLocation(this.program, `uPointLights[${i}].color`);
            const iLoc = gl.getUniformLocation(this.program, `uPointLights[${i}].intensity`);
            const rLoc = gl.getUniformLocation(this.program, `uPointLights[${i}].radius`);
            if (pLoc) gl.uniform3f(pLoc, p.pos.x, p.pos.y, p.pos.z);
            if (cLoc) gl.uniform3fv(cLoc, p.color);
            if (iLoc) gl.uniform1f(iLoc, p.intensity);
            if (rLoc) gl.uniform1f(rLoc, p.radius);
        }

        const model = Mat4.create();
        const normMat = Mat4.create();

        // Render each mesh
        for (const obj of scene.objects) {
            if (!obj.visible) continue;

            Mat4.compose(model, obj.position, obj.rotation, obj.scale);
            Mat4.invert(normMat, model);
            // Transpose normal matrix
            const n00 = normMat[0], n01 = normMat[1], n02 = normMat[2];
            const n10 = normMat[4], n11 = normMat[5], n12 = normMat[6];
            const n20 = normMat[8], n21 = normMat[9], n22 = normMat[10];
            normMat[1] = n10; normMat[2] = n20;
            normMat[4] = n01; normMat[6] = n21;
            normMat[8] = n02; normMat[9] = n12;

            gl.uniformMatrix4fv(this.uniforms.uModel, false, model);
            gl.uniformMatrix4fv(this.uniforms.uNormalMatrix, false, normMat);

            const mat = obj.material;
            gl.uniform3fv(this.uniforms.uAlbedo, mat.color);
            gl.uniform1f(this.uniforms.uRoughness, mat.roughness);
            gl.uniform1f(this.uniforms.uMetallic, mat.metallic);
            gl.uniform3fv(this.uniforms.uEmissive, mat.emissive);
            gl.uniform1f(this.uniforms.uOpacity, mat.opacity);
            gl.uniform1f(this.uniforms.uSelected, (obj.id === selectedId) ? 1.0 : 0.0);

            const bufs = this.getMeshBuffers(obj);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pos);
            gl.enableVertexAttribArray(this.attribs.position);
            gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufs.norm);
            gl.enableVertexAttribArray(this.attribs.normal);
            gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufs.uv);
            gl.enableVertexAttribArray(this.attribs.uv);
            gl.vertexAttribPointer(this.attribs.uv, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);

            if (mat.wireframe) {
                gl.drawElements(gl.LINES, bufs.count, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawElements(gl.TRIANGLES, bufs.count, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    exportHighRes(scene, camera, width, height) {
        const origW = this.canvas.width;
        const origH = this.canvas.height;

        this.canvas.width = width;
        this.canvas.height = height;

        this.renderScene(scene, camera, null);
        const dataUrl = this.canvas.toDataURL('image/png');

        this.canvas.width = origW;
        this.canvas.height = origH;
        this.renderScene(scene, camera, null);

        return dataUrl;
    }
}

