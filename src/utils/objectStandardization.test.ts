import { describe, expect, it } from 'vitest'
import {
  categoryColor,
  categoryForStaticMarker,
  iconKeyForStaticMarker,
  inferLayer,
  inferStaticMarkerDisplayLayers,
  inferStaticMarkerLayer,
  normalizeRadarObject,
  normalizeStaticMarker,
  parseCategory,
  parseLayer,
} from './objectStandardization'

describe('objectStandardization static marker rules', () => {
  it('maps source static marker groups to app categories', () => {
    expect(categoryForStaticMarker('Dungeon')).toBe('shrine')
    expect(categoryForStaticMarker('DragonTears')).toBe('dragonTear')
    expect(categoryForStaticMarker('CheckPoint')).toBe('lightroot')
  })

  it('keeps source Chasm markers visible on Surface and Depths when the height matches source behavior', () => {
    const marker = {
      Icon: 'Chasm',
      MessageID: 'DeepHole_Test',
    }

    expect(inferStaticMarkerLayer('Chasm', marker, 10)).toBe('Depths')
    expect(inferStaticMarkerDisplayLayers('Chasm', marker, 10)).toEqual([
      'Surface',
      'Depths',
    ])
  })

  it('keeps Hyrule Castle style low chasms on Depths only', () => {
    expect(inferStaticMarkerDisplayLayers('Chasm', { Icon: 'Chasm' }, -105)).toEqual([
      'Depths',
    ])
  })

  it('normalizes static markers into stable MapObject fields', () => {
    // 模拟源站 static.json 里的 Well marker，验证共享规则能保留 Cave/Well 双图标口径。
    const object = normalizeStaticMarker(
      {
        hash_id: 'static-1',
        Icon: 'Well',
        MessageID: 'Well_Test',
        Translate: {
          X: 10,
          Y: 20,
          Z: 30,
        },
      },
      {
        markerType: 'Cave',
        displayName: 'Test Well',
        idPrefix: 'static',
        note: 'Test static marker',
      },
    )

    expect(object).toMatchObject({
      id: 'static-1',
      name: 'Well_Test',
      displayName: 'Test Well',
      actor: 'CaveMarker',
      category: 'cave',
      layer: 'Surface',
      iconKey: 'well',
      sourceKind: 'static',
    })
  })
})

describe('objectStandardization radar rules', () => {
  it('infers radar object category, layer, color, icon, and searchable tags', () => {
    // 模拟 radar API 返回的 Korok raw 对象，验证离线构建和前端搜索使用同一套推断规则。
    const object = normalizeRadarObject(
      {
        hash_id: 'korok-1',
        name: 'Npc_HiddenKorokFly',
        map_type: 'MainField',
        map_name: 'SkyIsland_A',
        fieldarea: 'Sky_01',
        region: 'Hyrule',
        pos: [1, 700, 2],
        korok_id: '42',
      },
      { query: 'Korok' },
    )

    expect(object).toMatchObject({
      id: 'korok-1',
      name: 'Korok 42',
      category: 'korok',
      layer: 'Sky',
      color: categoryColor('korok'),
      iconKey: 'korok',
      sourceKind: 'raw',
    })
    expect(object?.tags).toContain('Korok')
  })

  it('keeps map unit, drop, equipment, and compact raw params for the details panel', () => {
    const object = normalizeRadarObject({
      objid: 372,
      hash_id: '0x40b1',
      name: 'TBox_Field_Stone',
      map_type: 'MainField',
      map_name: 'A-1',
      fieldarea: 'Surface3',
      region: 'Rospro Pass',
      pos: [-4324.5, 397.56, -3326],
      equip: ['Weapon_Bow_017'],
      drop: {
        type: 'Actor',
        value: ['Weapon_Bow_017'],
      },
      scale: 0,
      map_static: 0,
    })

    expect(object).toMatchObject({
      mapType: 'MainField',
      mapName: 'A-1',
      fieldArea: 'Surface3',
      region: 'Rospro Pass',
      equipment: ['Weapon_Bow_017'],
      drop: {
        type: 'Actor',
        values: ['Weapon_Bow_017'],
      },
      rawParams: {
        objid: 372,
        hash_id: '0x40b1',
        scale: 0,
        map_static: 0,
      },
    })
  })

  it('can drop unmatched radar locations during offline index construction', () => {
    expect(
      normalizeRadarObject(
        {
          hash_id: 'location-1',
          name: 'UnknownLocationActor',
          pos: [0, 0, 0],
        },
        { dropUnmatchedLocations: true },
      ),
    ).toBeNull()
  })

  it('lets static marker metadata override radar category and display fields', () => {
    // raw 对象命中 static marker 时，static marker 是权威来源，应覆盖分类、图标和显示字段。
    const object = normalizeRadarObject(
      {
        hash_id: 'shrine-1',
        name: 'SomeActor',
        pos: [0, 0, 0],
      },
      {
        staticMarker: {
          markerType: 'Dungeon',
          icon: 'Dungeon',
          displayName: 'Ukouh Shrine',
          showLevel: 'Near',
          priority: 10,
          shrineInCave: true,
        },
      },
    )

    expect(object).toMatchObject({
      category: 'shrine',
      displayName: 'Ukouh Shrine',
      iconKey: 'shrine_cave',
      showLevel: 'Near',
      priority: 10,
      sourceKind: 'static',
    })
  })
})

describe('objectStandardization small parsing helpers', () => {
  it('parses unknown values with safe defaults', () => {
    expect(parseCategory('not-real')).toBe('location')
    expect(parseLayer('not-real')).toBe('Surface')
  })

  it('infers Depths and Sky layers from radar metadata', () => {
    expect(inferLayer({ map_type: 'MinusField', pos: [0, 0, 0] })).toBe('Depths')
    expect(inferLayer({ map_name: 'SkyIsland', pos: [0, 0, 0] })).toBe('Sky')
  })

  it('maps source icons to app icon keys', () => {
    expect(iconKeyForStaticMarker('Dungeon', 'Dungeon', false)).toBe('shrine')
    expect(iconKeyForStaticMarker('Dungeon', 'Dungeon', true)).toBe('shrine_cave')
    expect(iconKeyForStaticMarker('Cave', 'Well', false)).toBe('well')
    expect(iconKeyForStaticMarker('Shop', 'ShopBougu', false)).toBe('shop_bougu')
    expect(iconKeyForStaticMarker('Place', 'Castle', false)).toBe('castle')
  })

  it('uses source-style fallback icons for raw objects without static markers', () => {
    expect(
      normalizeRadarObject({
        hash_id: 'shop-armor',
        name: 'Npc_Shop_Armor',
        Location: 'ShopBougu_Test',
        pos: [0, 0, 0],
      }),
    ).toMatchObject({
      category: 'shop',
      iconKey: 'shop_bougu',
    })

    expect(
      normalizeRadarObject({
        hash_id: 'well-raw',
        name: 'CaveEntrance_Well',
        Location: 'Well_Test',
        pos: [0, 0, 0],
      }),
    ).toMatchObject({
      category: 'cave',
      iconKey: 'well',
    })
  })
})
