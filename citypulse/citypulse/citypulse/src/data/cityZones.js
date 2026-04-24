import { CITY_ZONES, ZONE_COORDINATES } from './seedData'

export const cityZones = CITY_ZONES.map((zone) => ({
  id: zone,
  ...ZONE_COORDINATES[zone],
}))
