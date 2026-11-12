"""Keep geometry bytes intact while removing embedded textures from monochrome GLBs."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'public/assets/mobile-models'
for name in ('electric-guitar', 'cassette-reels'):
    original = (root / f'{name}.glb').read_bytes()
    size = struct.unpack_from('<I', original, 12)[0]
    gltf = json.loads(original[20:20 + size])
    binary = original[28 + size:]
    image_views = {image['bufferView'] for image in gltf.get('images', [])}
    views, data, mapping = [], bytearray(), {}
    for index, view in enumerate(gltf['bufferViews']):
        if index in image_views:
            continue
        mapping[index] = len(views)
        offset = view.get('byteOffset', 0)
        chunk = binary[offset:offset + view['byteLength']]
        data.extend(b'\0' * (-len(data) % 4))
        views.append({**view, 'byteOffset': len(data)})
        data.extend(chunk)
        assert data[views[-1]['byteOffset']:] == chunk
    for accessor in gltf['accessors']:
        if 'bufferView' in accessor:
            accessor['bufferView'] = mapping[accessor['bufferView']]
        for item in accessor.get('sparse', {}).values():
            if isinstance(item, dict) and 'bufferView' in item:
                item['bufferView'] = mapping[item['bufferView']]
    def strip_textures(value):
        if isinstance(value, dict):
            return {key: strip_textures(item) for key, item in value.items() if not key.endswith('Texture')}
        if isinstance(value, list):
            return [strip_textures(item) for item in value]
        return value
    gltf['materials'] = strip_textures(gltf.get('materials', []))
    for key in ('images', 'textures', 'samplers'):
        gltf.pop(key, None)
    gltf['bufferViews'] = views
    gltf['buffers'] = [{'byteLength': len(data)}]
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    data.extend(b'\0' * (-len(data) % 4))
    result = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(data))
    result += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
    result += struct.pack('<II', len(data), 0x004E4942) + data
    (root / f'{name}-wire.glb').write_bytes(result)
    print(f'{name}: {len(original):,} -> {len(result):,} bytes')
