from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import numpy as np
from sklearn.neighbors import BallTree
import os
import glob
from rapidfuzz import process, fuzz
import pandas as pd
from geopy.distance import geodesic
from shapely.geometry import Point, Polygon

app = Flask(__name__)
CORS(app)

# Load ZIP CODE reference from your JSON file (adjust path if needed)
with open("zip_code_cluster.json", encoding='utf-8') as f:
    zipcodes = json.load(f)

#Read csv file with neighborhoods Collective Intelligence
ci = pd.read_csv("data/CollectiveIntelligence.csv", encoding='utf-8')


# Build an index keyed by the lowercase street name and by postal code
zipcode_index = {}
for entry in zipcodes:
    key_street = entry["Street Name"].strip().lower()
    key_postal = entry["Postal Code"].strip()
    coords = (entry["Latitude"], entry["Longitude"])
    cluster = entry.get("cluster")  # ou ajuste conforme o nome do campo real
    zip_code = entry["Postal Code"]

    info = {
        "coords": coords,
        "cluster": cluster,
        "zip_code": zip_code
    }

    zipcode_index[key_street] = info
    zipcode_index[key_postal] = info
    

# Load ALL infrastructure points from all JSON files inside the folder "infra"
infra_points = []
infra_info = []

infra_files = glob.glob("infra/*.json")

for file in infra_files:
    infra_type = os.path.basename(file).replace(".json", "")
    with open(file, encoding='utf-8') as f:
        data = json.load(f)

    for item in data["features"]:
        try:
            # Try first the flat keys or fall back on geometry.coordinates:
            lat = item.get("Latitude") or (item.get("geometry", {}).get("coordinates", [])[1] if item.get("geometry") else None)
            lng = item.get("Longitude") or (item.get("geometry", {}).get("coordinates", [])[0] if item.get("geometry") else None)
            if lat is None or lng is None:
                continue

            lat, lng = float(lat), float(lng)

            # Store the point in radians for BallTree:
            infra_points.append([np.radians(lat), np.radians(lng)])
            infra_info.append({
                "type": infra_type,
                "Latitude": lat,
                "Longitude": lng,
                "properties": item.get("properties", item)
            })
        except Exception as e:
            print(f"Error in {file}: {e}")

# Build BallTree (using haversine metric for geospatial queries)
tree = BallTree(np.array(infra_points), metric='haversine')


# Freguesias Match
def find_freguesia(lat, lon):
    with open("data/Freguesias_Aux.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    point = Point(lon, lat)

    for feature in data.get("features", []):
        coords_list = feature.get("Coordinates", [])
        for polygon_coords in coords_list:
            try:
                polygon = Polygon(polygon_coords)
                if polygon.contains(point):
                    return feature.get("INF_NOME", "Unknown")
            except Exception as e:
                print(f"Erro ao processar polígono: {e}")
                continue

    return "Not found"

# População por freguesia

def get_freguesia_populacao(freguesia_name):
    try:
        with open('data/População_Aux.json', 'r') as f:
            data = json.load(f)
            if freguesia_name in data:
                return data[freguesia_name]
            else:
                print(f"Freguesia '{freguesia_name}' not found in the JSON file.")
                return None
    except Exception as e:
        print(f"Erro ao processar {e}")


# Edificios por freguesia

def get_freguesia_edificios(freguesia_name):
    try:
        with open('data/Edíficios_Lugar_Aux.json', 'r') as f:
            data = json.load(f)
            if freguesia_name in data:
                return data[freguesia_name]
            else:
                print(f"Freguesia '{freguesia_name}' not found in the JSON file.")
                return None
    except Exception as e:
        print(f"Erro ao processar {e}")


# Idade Edificios por freguesia

def get_freguesia_idade_edificios(freguesia_name):
    try:
        with open('data/Idade_Edificios_Aux.json', 'r') as f:
            data = json.load(f)
            if freguesia_name in data:
                return list(data[freguesia_name].values())[0]  # Return the list of values
            else:
                print(f"Freguesia '{freguesia_name}' not found in the JSON file.")
                return None
    except Exception as e:
        print(f"Erro ao processar: {e}")
        return None


#Indices 
def calcular_indice_acessibilidade(infraestruturas, lat_centro, lon_centro, tipos_excluidos=["Acidentes","Candeeiros"]):
    if tipos_excluidos is None:
        tipos_excluidos = []

    soma_inverso_distancia = 0
    total_infra = 0

    for infra in infraestruturas:
        tipo = infra['properties'].get('type')
        if tipo in tipos_excluidos:
            continue

        dist = geodesic((lat_centro, lon_centro), (infra['Latitude'], infra['Longitude'])).meters
        if dist == 0:
            dist = 0.0001  # evitar divisão por zero
        soma_inverso_distancia += 1 / dist
        total_infra += 1

    if total_infra == 0:
        return "Baixo"

    score = soma_inverso_distancia / total_infra

    if score > 0.01:
        return "Excelente"
    elif score > 0.007:
        return "Bom"
    elif score > 0.004:
        return "Moderado"
    else:
        return "Baixo"


def calcular_indice_conectividade(infraestruturas, raio_metros):
    tipos_transporte = [
        'Carris_Metropolitana',
        'Estações_Metro',
        'Estações_Comboio',
        'Estações_Fluvial',
       'Elevadores_e_Ascensores'
    ]
    total = sum(1 for infra in infraestruturas if any(tipo in infra['type'] for tipo in tipos_transporte))
    
    area_km2 = np.pi * (raio_metros / 1000) ** 2
    densidade = total / area_km2

    if densidade > 50:
        return "Excelente"
    elif densidade > 30:
        return "Bom"
    elif densidade > 15:
        return "Moderado"
    else:
        return "Baixo"


def calcular_indice_lazer(infraestruturas):
    area_total = 0
    parques = 0
    equipamentos = 0

    for infra in infraestruturas:
        tipo = infra['properties']['type']
        if tipo in ['Parques', 'Jardins_Parques_Urbano', 'Parques_de_Merendas','Parques_Infantis','Desporto_EquipamentosFitness','Miradouros','Parques_Caninos','Desporto_Instalações','Desporto_ActividadesRadicais']:
            parques += 1
        #    area_total += infra.get('properties', {}).get('area', 0)  # se tiver campo 'area'
        elif tipo in ['Desporto_EquipamentosFitness']:
            equipamentos += 1
       

    score = area_total / 10000 + parques + equipamentos

    if score > 10:
        return "Excelente"
    elif score > 6:
        return "Bom"
    elif score > 3:
        return "Moderado"
    else:
        return "Baixo"


def calcular_indice_cultural(infraestruturas):
    total = sum(1 for infra in infraestruturas if infra['properties']['type'] in ['Museus','Imóveis_e_Monumentos_de_Interesse_Público','Teatros','Arquitetura_Religiosa','Património_Mundial','Estatuária','Monumentos_Nacionais'])

    if total > 5:
        return "Excelente"
    elif total > 3:
        return "Bom"
    elif total > 1:
        return "Moderado"
    else:
        return "Baixo"
    

#Indexes for Collective Intelligence
def get_collective_intelligence_index(cluster, postal_code, df=ci):
    cluster= int(cluster)
    if cluster == -1:
        filtered_df = df[df['Postal Code'] == postal_code]
        if not filtered_df.empty:
            return filtered_df 
    else:    
        filtered_df = df[df['cluster'] == cluster]
        return filtered_df

def indice_valor_categorico(score):
    
    score = float(score)
    if score > 0.75:
        return "Excelente"
    elif score > 0.50:
        return "Bom"
    elif score > 0.25:
        return "Moderado"
    elif score >= 0:
        return "Baixo"
    else:
        return None
    
def indice_valor_categorico2(score):
    
    score = float(score)
    if score > 0.5:
        return "Sim"
    else:
        return "Não"

# Endpoint for fuzzy suggestions in a dropdown (using RapidFuzz)
@app.route("/suggestions", methods=["GET"])
def suggestions():
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify([])
    all_keys = list(zipcode_index.keys())
    # Get up to 10 best fuzzy-matched suggestions (threshold score 60)
    matches = process.extract(query, all_keys, scorer=fuzz.WRatio, limit=10)
    suggestions_list = [match[0] for match in matches if match[1] >= 80]
    return jsonify(suggestions_list)

# Endpoint to search for infraestruturas within a given radius from the zipcode location
@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("query", "").strip().lower()
    radius = float(request.args.get("radius", 500))  # em metros

    # Buscar dados da query no índice de códigos postais
    data = zipcode_index.get(query)
    if not data:
        return jsonify({"error": "Endereço ou código postal não encontrado."}), 404

    lat, lng = data["coords"]
    cluster = data.get("cluster")
    zip_code = data.get("zip_code")

    # Conversão para coordenadas em radianos para o BallTree
    point_rad = [[np.radians(lat), np.radians(lng)]]
    radius_rad = radius / 6371000  # raio da Terra em metros -> radianos

    # Infraestruturas próximas
    indices = tree.query_radius(point_rad, r=radius_rad)[0]
    results = [infra_info[i] for i in indices]

    # Índices calculados
    indice_acessibilidade = calcular_indice_acessibilidade(results, lat, lng)
    indice_conectividade = calcular_indice_conectividade(results, radius)
    indice_lazer = calcular_indice_lazer(results)
    indice_cultural = calcular_indice_cultural(results)

    # Dados da freguesia
    freguesia = find_freguesia(lat, lng)
    freguesia_populacao = get_freguesia_populacao(freguesia)
    freguesia_edificios = get_freguesia_edificios(freguesia)
    freguesia_idade_edificios = get_freguesia_idade_edificios(freguesia)

    # Índices de inteligência coletiva
    ci_info = get_collective_intelligence_index(cluster, postal_code=zip_code)

    # Se não houver dados, definir valores nulos
    if ci_info is None or ci_info.empty:
        mobilidade_index = None
        seguranca_index = None
        servicos_index = None
        espacos_verdes_index = None
        higiene_urbana_index = None
        crescimento_index = None
    else:
        mobilidade_index = indice_valor_categorico(ci_info['Mobilidade_Index'].iloc[0])
        seguranca_index = indice_valor_categorico(ci_info['Segurança_Index'].iloc[0])
        servicos_index = indice_valor_categorico(ci_info['Serviços_Index'].iloc[0])
        espacos_verdes_index = indice_valor_categorico(ci_info['Espaços Verdes_Index'].iloc[0])
        higiene_urbana_index = indice_valor_categorico(ci_info['Higiene Urbana_Index'].iloc[0])
        crescimento_index = indice_valor_categorico2(ci_info['Crescimento_Index'].iloc[0])

    return jsonify({
        "center": {"lat": lat, "lng": lng},
        "infra": results,
        "indice_acessibilidade": indice_acessibilidade,
        "indice_conectividade": indice_conectividade,
        "indice_lazer": indice_lazer,
        "indice_cultural": indice_cultural,
        "freguesia": freguesia,
        "populacao": freguesia_populacao,
        "edificios": freguesia_edificios,
        "idade_edificios": freguesia_idade_edificios,
        "mobilidade_index": mobilidade_index,
        "seguranca_index": seguranca_index,
        "servicos_index": servicos_index,
        "espacos_verdes_index": espacos_verdes_index,
        "higiene_urbana_index": higiene_urbana_index,
        "crescimento_index": crescimento_index,
    })
if __name__ == "__main__":
    app.run(debug=True)
