#version 140

in vec4 shadowCoord;
in vec3 x_material_color;
in vec3 surfaceNormal;
in vec3 x_position;
in float x_radius;
in vec2 x_tex_coords;
flat in int x_ground;
in float x_height;

out vec3 color;

// Vector from the camera to the sun
uniform vec3 sun_dir;
uniform vec3 sun_pos;
// FIXME This should be a `sampler2DShadow`, but glium doesn't expose it
uniform sampler2D shadow_map;

uniform sampler2D normal_sand;
uniform sampler2D normal_snow;
uniform sampler2D normal_grass;
uniform sampler2D normal_stone;
uniform sampler2D normal_dirt;
uniform sampler2D normal_mulch;
// Surface textures
uniform sampler2D sand_texture;
uniform sampler2D grass_texture;
uniform sampler2D snow_texture;
uniform sampler2D stone_texture;
uniform sampler2D dirt_texture;
uniform sampler2D mulch_texture;

// Percentage-closer filtering (square) radius in pixels
const int SHADOW_PCF_RADIUS = 1;

const vec3 sun = normalize(vec3(1.0, 0.0, 1.0));
const float SHADOW_BIAS = 0.00001;    // FIXME does this even work?
const float AMBIENT = 0.2;

/// Calculates Tangent Binormal Normal (tbn) Matrix
mat3 cotangent_frame(vec3 normal, vec3 pos, vec2 uv) {
    vec3 dp1 = dFdx(pos);
    vec3 dp2 = dFdy(pos);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    vec3 dp2perp = cross(dp2, normal);
    vec3 dp1perp = cross(normal, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, B * invmax, normal);
}

void main() {

    // =================
    // PURE SHADOW STUFF
    // =================

    // TODO: Maybe put this into a method?

    // Shadow map height/width in pixels:
    float SHADOW_MAP_SIZE = textureSize(shadow_map, 0).x;

    vec3 lightCoords = shadowCoord.xyz / shadowCoord.w;
    lightCoords = lightCoords * 0.5 + 0.5;
    float pixelOffset = 1.0 / SHADOW_MAP_SIZE;
    float shadowFactor = 0.0;

    for (int y = -SHADOW_PCF_RADIUS; y <= SHADOW_PCF_RADIUS; y++) {
        for (int x = -SHADOW_PCF_RADIUS; x <= SHADOW_PCF_RADIUS; x++) {
            vec2 offset = vec2(x * pixelOffset, y * pixelOffset);
            vec2 mapCoords = lightCoords.xy + offset;
            if (mapCoords.x > 1.0 || mapCoords.x < 0 || mapCoords.y > 1 || mapCoords.y < 0) {
                // Guess the shadow depending on the sun angle
                float sunVertDot = 0.5 + dot(sun_dir, vec3(0, 0, 1)) * 0.5;
                shadowFactor += sunVertDot * 0.8;
            } else {
                bool shadow = texture(shadow_map, mapCoords).r
                    < lightCoords.z + SHADOW_BIAS;
                shadowFactor += shadow ? 1.0 : 0.0;
            }
        }
    }

    // Height/Width of the square we sample for Percentage Closer Filtering
    // (in Pixels)
    const int PCF_PIXELS = 1 + 2 * SHADOW_PCF_RADIUS;

    // Divide by number of pixels we sampled, to get  a range from 0 to 1
    shadowFactor /= PCF_PIXELS * PCF_PIXELS;

    // ==================
    // LIGHT CALCULATIONS
    // ==================

    // Calculate normal map relative to surface
    vec3 normal_map;
    vec2 tex = vec2(x_tex_coords.x, x_tex_coords.y);

    if (x_ground == 1) {
        normal_map = texture(normal_grass, tex).rgb;
    } else if (x_ground == 2) {
        normal_map = texture(normal_sand, tex).rgb;
    } else if (x_ground == 3) {
        normal_map = texture(normal_snow, tex).rgb;
    } else if (x_ground == 4) {
        normal_map = texture(normal_dirt, tex).rgb;
    } else if (x_ground == 5) {
        normal_map = texture(normal_stone, tex).rgb;
    } else if (x_ground == 7) {
        normal_map = texture(normal_mulch, tex).rgb;
    }



    // Calculate Tangent Binormal Normal (tbn) Matrix to multiply with normal_map
    // to convert to real normals
    mat3 tbn = cotangent_frame(normal_map, x_position, x_tex_coords);
    vec3 real_normal = normalize(tbn * -(normal_map * 2.0 - 1.0));

    // Get Fragment position
    vec3 pixel_pos = vec3(x_position.x, x_position.y, x_height);
    // Calculate vector from sun --> fragment
    vec3 light = normalize(sun_pos - pixel_pos);
    // Calculate vector from Fragment --> Camera
    vec3 camera_dir = normalize(pixel_pos - light - sun_dir);

    // Diffuse color is the material color
    vec3 diffuse_color = x_material_color;

    // Diffuse multiplier
    float diffuse = max(dot(normalize(real_normal), normalize(light)), 0.0);

    // Calculate specular color
    vec3 specular_color = vec3(1.0, 1.0, 1.0);
    vec3 half_direction = normalize(light + camera_dir);
    float specular = pow(max(dot(half_direction, real_normal), 0.0), 10.0);

    // Final color calculation
    color = diffuse_color * diffuse + specular_color * specular;

    // TODO: FIXME Shadow broken for now
    // color = diffuse_color * AMBIENT + diffuse_color * diffuse * (1.0 - shadowFactor);

    // Set Border to distinguish hexagons
    if (x_radius > 0.98) {
        color *= 0.7;
    }
}
