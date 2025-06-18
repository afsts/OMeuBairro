import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "@fontsource/orbitron";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png",
});


function App() {
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(500);
  const [results, setResults] = useState([]);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const dropdownRef = useRef(null);
  const [acessibilidade, setAcessibilidade] = useState(null);
  const [conectividade, setConectividade] = useState(null);
  const [lazer, setLazer] = useState(null);
  const [cultural, setCultural] = useState(null);
  const [freguesia, setFreguesia] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [populacao, setPopulacao] = useState(null);
  const [edificios, setEdificios] = useState(null);
  const [idade_edificios, setIdade_edificios] = useState(null);
  const [mobilidade_index, setMobilidade_Index] = useState(null);
  const [seguranca_index, setSegurança_Index] = useState(null);
  const [servicos_index, setServiços_Index] = useState(null);
  const [espacos_verdes_index, setEspaços_Verdes_Index] = useState(null);
  const [higiene_urbana_index, setHigiene_Urbana_Index] = useState(null);
  const [crescimento_index, setCrescimento_Index] = useState(null);
  const canvasPop = useRef(null);
  const canvasEdi = useRef(null);
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [isIndicesExpanded, setIsIndicesExpanded] = useState(false);
  const [isFreguesiaExpanded, setIsFreguesiaExpanded] = useState(false);
  const [isInteligenciaExpanded, setIsInteligenciaExpanded] = useState(false);


  const excludedTypes = ["Acidentes","Candeeiros"]; // List of types to exclude

  // Group the results based on type, but filter out the excluded types first
  const groupedResults = results
    .filter((item) => !excludedTypes.includes(item.properties.type)) // Filter out the excluded types
    .reduce((acc, item) => {
      const type = item.properties.type || "Desconhecido";
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});

  const displayFields = [
    "INF_NOME",
    "INF_MORADA",
    "INF_LOCALIZACAO",
    "INF_TELEFONE",
    "INF_EMAIL",
    "INF_SITE",
    "AGRUPAMENTO",
    "TIPOLOGIA",
    "INF_DESCRICAO",
    "INF_REDESOCIAL",
    "INF_ATORPRINCIPAL",
    "INF_ATORNATUREZA",
    "INF_CAPACIDADE",
    "INFO_NATUREZA",
  ];

  const fieldLabels = {
    INF_NOME: "Nome",
    INF_MORADA: "Morada",
    INF_TELEFONE: "Telefone",
    INF_EMAIL: "Email",
    INF_SITE: "Site",
    INF_REDESOCIAL: "Redes Sociais",
    INF_DESCRICAO: "Descrição",
    INF_ATORPRINCIPAL: "Ator Principal",
    INF_ATORNATUREZA: "Natureza",
    INF_CAPACIDADE: "Capacidade",
    INF_LOCALIZACAO: "Localização Exata",
    INFO_NATUREZA: "Natureza",
  };

  const freguesiaLabels = {
    Estrela: "Estrela",
    Misericordia: "Misericórdia",
    "Santa Maria Maior": "Santa Maria Maior",
    "Sao Vicente": "São Vicente",
    "Campo de Ourique": "Campo de Ourique",
    Ajuda: "Ajuda",
    Alcantara: "Alcântara",
    "Santo Antonio": "Santo António",
    Arroios: "Arroios",
    "Penha de Franca": "Penha de França",
    Beato: "Beato",
    Campolide: "Campolide",
    "Avenidas Novas": "Avenidas Novas",
    Areeiro: "Areeiro",
    "Sao Domingos de Benfica": "São Domingos de Benfica",
    Benfica: "Benfica",
    Marvila: "Marvila",
    Alvalade: "Alvalade",
    Carnide: "Carnide",
    Lumiar: "Lumiar",
    Olivais: "Olivais",
    "Santa Clara": "Santa Clara",
    "Parque das Nacoes": "Parque das Nações",
  };

  useEffect(() => {
    if (query.length >= 3) {
      fetch(`${process.env.REACT_APP_API_URL}/suggestions?q=${query}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(data))
        .catch((err) => console.error(err));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    const canvas = canvasPop.current;
    if (!canvas || !populacao || !populacao.H || !populacao.M) return;
  
    const ctx = canvas.getContext('2d');
    const padding = 60;
  
    // Sort labels by numeric age group
    const labels = Object.keys(populacao.H).sort((a, b) => {
      const getStartAge = str => parseInt(str.split('-')[0].trim());
      return getStartAge(a) - getStartAge(b);
    });
  
    const dataH = labels.map(label => populacao.H[label] || 0);
    const dataM = labels.map(label => populacao.M[label] || 0);
  
    const maxValue = Math.max(...dataH, ...dataM);
    const step = 400;
    const maxY = Math.ceil(maxValue / step) * step;
  
    const chartHeight = canvas.height - 2 * padding;
    const chartWidth = canvas.width - 2 * padding;
  
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
  
    // Y-axis fixed step ticks
    ctx.strokeStyle = '#ccc';
    ctx.fillStyle = 'black';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
  
    for (let value = 0; value <= maxY; value += step) {
      const y = canvas.height - padding - (value / maxY) * chartHeight;
  
      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding - 5, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
  
      // Tick label
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }
  
    // Draw bars
    const groupWidth = chartWidth / labels.length;
    const barWidth = groupWidth * 0.35;
  
    ctx.textAlign = 'center';
  
    labels.forEach((label, i) => {
      const baseX = padding + i * groupWidth;
  
      // Male (blue)
      const hVal = dataH[i];
      const hHeight = (hVal / maxY) * chartHeight;
      ctx.fillStyle = 'blue';
      ctx.fillRect(
        baseX + groupWidth * 0.1,
        canvas.height - padding - hHeight,
        barWidth,
        hHeight
      );
  
      // Female (red)
      const mVal = dataM[i];
      const mHeight = (mVal / maxY) * chartHeight;
      ctx.fillStyle = 'red';
      ctx.fillRect(
        baseX + groupWidth * 0.55,
        canvas.height - padding - mHeight,
        barWidth,
        mHeight
      );
  
      // X label
      ctx.fillStyle = 'black';
      ctx.fillText(label.replace(' anos', ''), baseX + groupWidth / 2, canvas.height - padding + 20);
    });
  
    // Legend
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.fillText('Masculino 🟦', canvas.width - 160, 30);
    ctx.fillText('Feminino 🟥', canvas.width - 160, 50);
  
  }, [populacao]);
  


  useEffect(() => {
    const canvas = canvasEdi.current;
    if (!canvas || !edificios) return;
  
    const ctx = canvas.getContext('2d');
  
    const keys = Object.keys(edificios);
    const labels = keys;
    const data = keys.map(key => edificios[key] || 0);
  
    const max = Math.max(...data);
    const min = 0;
    const padding = 60;
  
    const chartHeight = canvas.height - 2 * padding;
    const chartWidth = canvas.width - 2 * padding;
    const stepX = chartWidth / (data.length - 1);
  
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Draw Y-axis reference lines and labels
    const ySteps = 5; // how many reference lines
    const stepYValue = Math.ceil(max / ySteps);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'gray';
    ctx.textAlign = 'right';
  
    for (let i = 0; i <= ySteps; i++) {
      const value = i * stepYValue;
      const y = canvas.height - padding - (value * chartHeight / (max - min));
  
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.strokeStyle = '#ddd';
      ctx.stroke();
  
      ctx.fillText(value.toString(), padding - 10, y + 3);
    }
  
    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.strokeStyle = 'black';
    ctx.stroke();
  
    // X-axis labels
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = padding + i * stepX;
      const y = canvas.height - padding + 20;
      ctx.fillText(label.replace(' anos', ''), x, y);
    });
  
    // Draw line plot
    ctx.beginPath();
    data.forEach((value, i) => {
      const x = padding + i * stepX;
      const y = canvas.height - padding - (value * chartHeight / (max - min));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.stroke();
  
    // Optional: draw circles at each point
    data.forEach((value, i) => {
      const x = padding + i * stepX;
      const y = canvas.height - padding - (value * chartHeight / (max - min));
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#4a90e2';
      ctx.fill();
    });
  }, [edificios]);


  const handleSearch = (searchTerm) => {
    setLoading(true);
    setQuery(searchTerm);
    setSuggestions([]);
    fetch(`${process.env.REACT_APP_API_URL}/search?query=${searchTerm}&radius=${radius}`)
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          alert(data.error);
        } else {
          console.log(data);
          setCenter([data.center.lat, data.center.lng]);
          setResults(data.infra);
          setAcessibilidade(data.indice_acessibilidade);
          setConectividade(data.indice_conectividade);
          setLazer(data.indice_lazer);
          setCultural(data.indice_cultural);
          setFreguesia(data.freguesia);
          setPopulacao(data.populacao);
          setEdificios(data.edificios);
          setIdade_edificios(data.idade_edificios);
          setMobilidade_Index(data.mobilidade_index);
          setSegurança_Index(data.seguranca_index);
          setServiços_Index(data.servicos_index);
          setEspaços_Verdes_Index(data.espacos_verdes_index);
          setHigiene_Urbana_Index(data.higiene_urbana_index);
          setCrescimento_Index(data.crescimento_index);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
        alert("Erro ao carregar dados.");
      });
  };

  const toggleType = (type) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const redIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

// Tooltip component
const Tooltip = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const targetRef = useRef(null);

  const positionTooltip = () => {
    const tooltip = tooltipRef.current;
    const target = targetRef.current;

    if (tooltip && target) {
      const targetRect = target.getBoundingClientRect();
      const tooltipWidth = window.innerWidth * 0.9; // 90% da largura da viewport
      const leftOffset = (window.innerWidth - tooltipWidth) / 2;

      tooltip.style.position = 'absolute';
      tooltip.style.width = `${tooltipWidth}px`;
      tooltip.style.left = `${leftOffset}px`;
      tooltip.style.top = `${window.scrollY + targetRect.top - tooltip.offsetHeight - 10}px`;
    }
  };

  useEffect(() => {
    if (isVisible) {
      positionTooltip();
      window.addEventListener('scroll', positionTooltip);
      window.addEventListener('resize', positionTooltip);
      return () => {
        window.removeEventListener('scroll', positionTooltip);
        window.removeEventListener('resize', positionTooltip);
      };
    }
  }, [isVisible]);

  return (
    <>
      <span
        ref={targetRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        style={{ display: 'inline-block', position: 'relative' }}
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            background: "#6643b5",
            color: '#fff',
            padding: '10px',
            zIndex: 1000,
            textAlign: 'center',
            pointerEvents: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'normal',
          }}
        >
          {text}
        </div>
      )}
    </>
  );
};


// WEBPAGE PART

  return (
    <div
      style={{
        padding: "1rem",
        fontFamily: "'Orbitron', sans-serif",
        color: "#000000",
        //color: "#e0d7f8",
        //backgroundColor: "#0e0b1e",
        backgroundColor: "#2e1f4d",
        //backgroundColor: "#CCB3FF",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#c084fc",
          fontSize: "1.8rem",
          marginBottom: "1.5rem",
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        Descobre o teu Bairro!
      </h2>

      <div
        style={{
          position: "relative",
          textAlign: "center",
          marginBottom: "1rem",
          fontFamily: "'Orbitron', sans-serif",
        }}
        ref={dropdownRef}
      >
        <input
          type="text"
          value={query}
          placeholder="Rua ou Código Postal"
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #a855f7",
            backgroundColor: "#1a132f",
            color: "#e9d5ff",
            borderRadius: "8px",
            width: "300px",
            outline: "none",
            marginBottom: "0.5rem",
            transition: "all 0.3s ease",
            fontFamily: "'Orbitron', sans-serif",
          }}
        />

        <input
          type="number"
          value={radius || 0}
          onChange={(e) => {
            const value = e.target.value;
            setRadius(value === "" ? 0 : Number(value) || 0);
          }}
          style={{
            padding: "10px",
            border: "1px solid #a855f7",
            backgroundColor: "#1a132f",
            color: "#e9d5ff",
            borderRadius: "8px",
            width: "80px",
            marginLeft: "0.5rem",
            outline: "none",
            transition: "all 0.3s ease",
            fontFamily: "'Orbitron', sans-serif",
          }}
        />

        <button
          onClick={() => handleSearch(query)}
          style={{
            marginLeft: "0.5rem",
            padding: "10px 16px",
            background: "linear-gradient(90deg, #a855f7, #9333ea)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            transition: "background 0.3s ease",
            fontFamily: "'Orbitron', sans-serif",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "linear-gradient(90deg, #9333ea, #7e22ce)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "linear-gradient(90deg, #a855f7, #9333ea)";
          }}
        >
          Pesquisar
        </button>

        {suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "300px",
              background: "#1e1b3a",
              border: "1px solid #6b21a8",
              listStyle: "none",
              padding: 0,
              margin: 0,
              zIndex: 1000,
              maxHeight: "200px",
              overflowY: "auto",
              borderRadius: "6px",
              boxShadow: "0 4px 10px rgba(168, 85, 247, 0.2)",
              color: "#e0d7f8"
            }}
          >
            {suggestions.map((item, index) => (
              <li
                key={index}
                onClick={() => handleSearch(item)}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  borderBottom: "1px solid #3f3c61",
                  transition: "background 0.2s",
                  color: "#e0d7f8"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#4c1d95";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <p style={{ textAlign: "center", color: "#e0d7f8" }}>Carregando...</p>}

      <MapContainer
        center={center || [38.714391, -9.130744]}
        zoom={12}
        style={{ height: "85vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {center && (
          <>
            <Circle
              center={center}
              radius={parseInt(radius)}
              pathOptions={{ color: "blue" }}
            />
            <Marker position={center} icon={redIcon}>
              <Popup>{query}</Popup>
            </Marker>
          </>
        )}
        {results
          .filter((item) => !excludedTypes.includes(item.properties.type)) // Filter out excluded types
          .map((item, index) => (
            <Marker key={index} position={[item.Latitude, item.Longitude]}>
              <Popup>
                <b>{item.properties.type.replaceAll('_', ' ')}</b>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {results.length > 0 && (
        <div style={{ marginTop: "2rem", padding: "1rem"}}>
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#eef",
              borderRadius: "8px",
            }}
          >
            <button
              onClick={() => setIsSectionExpanded((prev) => !prev)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px",
                //background: "#cce",
                background: "#eef",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <span>Infraestruturas Encontradas ({results.length})</span>
              <span>{isSectionExpanded ? "▲" : "▼"}</span>
            </button>

            {isSectionExpanded && (
              <div style={{ marginTop: "1rem" }}>
                {Object.entries(groupedResults).map(([type, items]) => {
                  const isExpanded = expandedTypes[type];
                  return (
                    <div
                      key={type}
                      style={{
                        marginBottom: "1rem",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        background: "#f5f5f5",
                        overflow: "hidden",
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      <button
                        onClick={() => toggleType(type)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px",
                          background: "#ddd",
                          border: "none",
                          borderBottom: "1px solid #ccc",
                          fontWeight: "bold",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontFamily: "'Orbitron', sans-serif",
                        }}
                      >
                        <span>{type.replaceAll('_', ' ')} ({items.length})</span>
                        <span>{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {isExpanded && (
                        <div>
                          {items.map((item, index) => (
                            <div
                              key={index}
                              style={{
                                padding: "10px",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                              {displayFields.map(
                                (key) =>
                                  item.properties[key] !== undefined && (
                                    <p
                                      key={key}
                                      style={{ margin: "0", fontSize: "0.9em" }}
                                    >
                                      <strong>{fieldLabels[key] || key}:</strong>{" "}
                                      {item.properties[key]}
                                    </p>
                                  )
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#eef",
              borderRadius: "8px",
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            <button
              onClick={() => setIsIndicesExpanded((prev) => !prev)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px",
                //background: "#cce",
                background: "#eef",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <span>Índices de Avaliação</span>
              <span>{isIndicesExpanded ? "▲" : "▼"}</span>
            </button>

            {isIndicesExpanded && (
              <div style={{ marginTop: "1rem" }}>
                <p>
                  <Tooltip text="Este índice avalia a acessibilidade a infraestruturas importantes, como escolas, hospitais, farmácias e centros de saúde. Quanto mais próxima a infraestrutura estiver do centro, maior será a pontuação. O resultado final é categorizado como: Excelente, Bom, Moderado ou Baixo, dependendo da pontuação ponderada.">
                    <span style={{ cursor: 'pointer', color: 'blue' }}>❓</span>
                  </Tooltip>
                  <strong> Acessibilidade: </strong> {acessibilidade}
                </p>
                <p>
                  <Tooltip text="Este índice avalia o quão bem conectada uma área está em termos de opções de transporte, como estações de metro, estações de autocarro, estações de comboio e elevadores. Calcula a densidade de infraestruturas de transporte dentro de um raio especificado e atribui uma categoria com base na densidade de opções de transporte na área. As categorias são: Excelente, Bom, Moderado ou Baixo.">
                    <span style={{ cursor: 'pointer', color: 'blue' }}>❓</span>
                  </Tooltip>
                  <strong> Mobilidade: </strong> {conectividade}
                </p>
                <p>
                  <Tooltip text="Este índice avalia a disponibilidade de espaços de lazer, como parques, jardins, equipamentos desportivos e outras áreas recreativas. A pontuação final é categorizada como: Excelente, Bom, Moderado ou Baixo.">
                    <span style={{ cursor: 'pointer', color: 'blue' }}>❓</span>
                  </Tooltip>
                  <strong> Lazer: </strong> {lazer}
                </p>
                <p>
                  <Tooltip text="Este índice avalia a oferta cultural numa área, como museus, monumentos e teatros. A pontuação é categorizada como: Excelente, Bom, Moderado ou Baixo.">
                    <span style={{ cursor: 'pointer', color: 'blue' }}>❓</span>
                  </Tooltip>
                  <strong> Cultural: </strong> {cultural}
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#eef",
              borderRadius: "8px",
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            <button
              onClick={() => setIsFreguesiaExpanded(prev => !prev)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px",
                //background: "#cce",
                background: "#eef",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <span>
                Índices por Freguesia (<strong>{freguesiaLabels[freguesia]}</strong>)
              </span>
              <span>{isFreguesiaExpanded ? "▲" : "▼"}</span>
            </button>

            <div style={{ display: isFreguesiaExpanded ? 'block' : 'none', marginTop: "1rem" }}>
              <p>
                <strong>Idade Média dos Edíficios:</strong> {idade_edificios} (anos)
              </p>

              <div style={{ padding: "20px" }}>
                <h2>População por Faixa Etária</h2>
                <canvas
                  ref={canvasPop || null}
                  width="1300"
                  height="500"
                  style={{
                    border: "1px solid #ccc",
                    width: "100%",
                    maxWidth: "800px",
                  }}
                ></canvas>
              </div>

              <div style={{ padding: "20px" }}>
                <h2>Novos Edifícios (N.º)</h2>
                <canvas
                  ref={canvasEdi || null}
                  width="1300"
                  height="500"
                  style={{
                    border: "1px solid #ccc",
                    width: "100%",
                    maxWidth: "800px",
                  }}
                ></canvas>
              </div>
            </div>
          </div>
          
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#eef",
              borderRadius: "8px",
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            <button
              onClick={() => setIsInteligenciaExpanded((prev) => !prev)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px",
                //background: "#cce",
                background: "#eef",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              <span>Índices Inteligência Coletiva<Tooltip text="Estes índices são calculados com base na experiência e vivencia no bairro por moradores vizinhos.">
                  <span style={{ cursor: 'pointer', color: 'blue' }}>❓</span>
                </Tooltip></span>
              <span>{isInteligenciaExpanded ? "▲" : "▼"}</span>
            </button>

            {isInteligenciaExpanded && (
              <div style={{ marginTop: "1rem" }}>

                <p><strong>Mobilidade: </strong> {mobilidade_index}</p>
                <p><strong>Segurança:</strong> {seguranca_index}</p>
                <p><strong>Serviços:</strong> {servicos_index}</p>
                <p><strong>Espaços Verdes:</strong> {espacos_verdes_index}</p>
                <p><strong>Higiene Urbana:</strong> {higiene_urbana_index}</p>
                <p><strong>Em Crescimento:</strong> {crescimento_index}</p>
            
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default App;







