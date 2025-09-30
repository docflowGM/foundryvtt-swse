{
  "Actor": {
    "types": [
      "character",
      "droid",
      "npc",
      "vehicle"
    ],
    "templates": {
      "base": {
        "name": "",
        "img": "icons/svg/mystery-man.svg",
        "system": {
          "species": "",
          "class": "",
          "subtype": "",
          "level": 1,
          "abilities": {
            "str": { "base": 10, "temp": 0 },
            "dex": { "base": 10, "temp": 0 },
            "con": { "base": 10, "temp": 0 },
            "int": { "base": 10, "temp": 0 },
            "wis": { "base": 10, "temp": 0 },
            "cha": { "base": 10, "temp": 0 }
          },
          "defenses": {
            "reflex":    { "ability": "dex", "class": 0, "armor": 0, "misc": 0, "total": 10 },
            "fortitude": { "ability": "con", "class": 0, "armor": 0, "misc": 0, "total": 10 },
            "will":      { "ability": "wis", "class": 0, "armor": 0, "misc": 0, "total": 10 }
          },
          "hp": { "value": 0, "max": 0, "threshold": 0 },
          "skills": [],
          "feats": [],
          "talents": [],
          "forcePowersList": [],
          "equipment": []
        }
      }
    },
    "character": {
      "templates": ["base"]
    },
    "droid": {
      "templates": ["base"],
      "system": {
        "species": "droid",
        "abilities": {
          "con": { "base": 0, "temp": 0 }
        },
        "secondWind": { "uses": 0, "healing": 0 }
      }
    },
    "npc": {
      "templates": ["base"],
      "system": {
        "isNPC": true
      }
    },
    "vehicle": {
      "templates": ["base"],
      "system": {
        "vehicleType": "",
        "crew": 0,
        "passengers": 0,
        "cargo": 0
      }
    }
  }
}
