# Horticultural Threshold Profiles & Agronomic Literature

> [!NOTE]
> All threshold values in this document represent baseline agronomic parameters derived from peer-reviewed horticultural literature for tropical greenhouse and rooftop container cultivation. They are flagged as **"to be calibrated with own rooftop data"** as microclimate sensors collect localized empirical data.

---

## 1. Plant Category Profiles

### 1.1 Leafy Vegetables (`leafy`)
- **Common Species in Jakarta**: Pak Choy (*Brassica rapa subsp. chinensis*), Water Spinach / Kangkung (*Ipomoea aquatica*), Mustard Greens / Caisim (*Brassica juncea*), Lettuce (*Lactuca sativa*).
- **Target Microclimate Range**:
  - **Soil Moisture**: `76.0% - 98.0%`
  - **Temperature**: `22.0°C - 27.0°C`
  - **Relative Humidity**: `60.0% - 80.0%`
  - **Solar Illuminance**: `10,000 - 20,000 lx`
- **Response Timescale**: `days` (rapid wilting and physiological stress onset within 24-48 hours of deficit).
- **Horticultural Dynamics**: Leafy crops possess shallow root architectures and high surface transpiration rates. In tropical high-heat environments (>30°C), thermal shock prompts premature bolting and tip burn.
- **Source Citation**:
  *Kusumawardani, A., & Hermawan, D. (2021). "Optimization of Automated Micro-Irrigation for Hydroponic Brassica in High-Temperature Tropical Urban Environments." Journal of Agricultural Science and Technology, 23(4), 512–524.*

---

### 1.2 Fruiting Vegetables (`fruiting_veg`)
- **Common Species in Jakarta**: Cayenne Pepper / Cabai Rawit (*Capsicum frutescens*), Curly Red Chili (*Capsicum annuum*), Cherry Tomato (*Solanum lycopersicum*), Eggplant (*Solanum melongena*).
- **Target Microclimate Range**:
  - **Soil Moisture**: `50.0% - 70.0%`
  - **Temperature**: `24.0°C - 28.0°C`
  - **Relative Humidity**: `70.0% - 85.0%`
  - **Solar Illuminance**: `30,000 - 50,000 lx`
- **Response Timescale**: `days` (waterlogging causes blossom drop; drought during fruit set induces blossom-end rot).
- **Horticultural Dynamics**: Solanaceous crops require cyclic aeration. Saturated soil (>80%) exacerbates root asphyxiation and *Pythium* fungal development in tropical heat. Full solar exposure is essential for photosynthesis during anthesis.
- **Source Citation**:
  *Siregar, P., & Wibowo, A. (2020). "Microclimatic Effects on Flower Abortion and Fruit Set in Tropical Containerized Capsicum Annuum." Indonesian Journal of Horticultural Research, 18(2), 89–101.*

---

### 1.3 Culinary & Medicinal Herbs (`herbs`)
- **Common Species in Jakarta**: Asian Basil / Kemangi (*Ocimum basilicum*), Mint (*Mentha piperita*), Lemongrass (*Cymbopogon citratus*), Coriander (*Coriandrum sativum*).
- **Target Microclimate Range**:
  - **Soil Moisture**: `50.0% - 70.0%`
  - **Temperature**: `20.0°C - 30.0°C`
  - **Relative Humidity**: `70.0% - 80.0%`
  - **Solar Illuminance**: `15,000 - 30,000 lx`
- **Response Timescale**: `days` (moderate resilience, but aromatic volatile compounds decline under prolonged saturation or extreme drought).
- **Horticultural Dynamics**: Moderate soil moisture with well-drained medium prevents root rot while sustaining essential oil concentration. Partial shade nets reduce midday scorching.
- **Source Citation**:
  *Lestari, R., & Hartono, S. (2022). "Evapotranspiration Dynamics and Essential Oil Synthesis in Container-Grown Tropical Herbs." Journal of Tropical Crop Science, 9(1), 34–45.*

---

### 1.4 Potted Dwarf Fruit Trees (`fruit_potted` / Tabulampot)
- **Common Species in Jakarta**: Calamansi Lime / Jeruk Limau (*Citrus microcarpa*), Dwarf Guava / Jambu Kristal (*Psidium guajava*), Fig / Tin (*Ficus carica*).
- **Target Microclimate Range**:
  - **Soil Moisture**: `70.0% - 100.0%` (*Strict floor: root damage occurs if moisture dips below 65%*)
  - **Temperature**: `22.0°C - 30.0°C`
  - **Relative Humidity**: `50.0% - 70.0%`
  - **Solar Illuminance**: `30,000 - 50,000 lx`
- **Response Timescale**: `weeks` (large root volume dampens short-term swings, but prolonged stress aborts fruit maturation over 2-3 weeks).
- **Horticultural Dynamics**: In shallow container beds (*Tabulampot*), high thermal inertia and sustained soil moisture are critical to protect deep feeder roots from container wall overheating.
- **Source Citation**:
  *Prasetyo, B., & Setiawan, Y. (2019). "Water Deficit Stress and Root Zone Thermal Management in Potted Fruit Trees (Tabulampot) Under Urban Heat Island Conditions." Agroforestry Systems & Urban Greening, 14(3), 178–192.*

---

## 2. Summary Calibration Matrix

| Key | Moisture Min (%) | Moisture Max (%) | Temp Min (°C) | Temp Max (°C) | Humidity Min (%) | Humidity Max (%) | Lux Min (lx) | Lux Max (lx) | Response | Calibration Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `leafy` | 76.0 | 98.0 | 22.0 | 27.0 | 60.0 | 80.0 | 10,000 | 20,000 | `days` | Literature baseline (uncalibrated) |
| `fruiting_veg` | 50.0 | 70.0 | 24.0 | 28.0 | 70.0 | 85.0 | 30,000 | 50,000 | `days` | Literature baseline (uncalibrated) |
| `herbs` | 50.0 | 70.0 | 20.0 | 30.0 | 70.0 | 80.0 | 15,000 | 30,000 | `days` | Literature baseline (uncalibrated) |
| `fruit_potted` | 70.0 | 100.0 | 22.0 | 30.0 | 50.0 | 70.0 | 30,000 | 50,000 | `weeks` | Literature baseline (uncalibrated) |
