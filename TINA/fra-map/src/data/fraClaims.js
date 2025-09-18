// Mock FRA claim polygons (demo only, not real data)
const fraClaims = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "claim_id": "C001",
        "village": "Demo Village A",
        "district": "Mandla",
        "state": "Madhya Pradesh",
        "status": "Approved"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [80.0, 22.8],
          [80.1, 22.8],
          [80.1, 22.9],
          [80.0, 22.9],
          [80.0, 22.8]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "claim_id": "C002",
        "village": "Demo Village B",
        "district": "Khammam",
        "state": "Telangana",
        "status": "Pending"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [80.3, 17.2],
          [80.4, 17.2],
          [80.4, 17.3],
          [80.3, 17.3],
          [80.3, 17.2]
        ]]
      }
    }
  ]
}

export default fraClaims
