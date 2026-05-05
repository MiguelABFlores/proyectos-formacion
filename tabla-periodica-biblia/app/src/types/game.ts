export type Testamento = "AT" | "NT";

export type CategoriaId =
  | "pentateuco"
  | "historicos_at"
  | "sapienciales"
  | "profeticos"
  | "evangelios"
  | "hechos"
  | "cartas"
  | "apocaliptico";

export interface Categoria {
  id: CategoriaId;
  nombre: string;
  testamento: Testamento;
  color: string;
  colorTexto: string;
  descripcion: string;
}

export interface Libro {
  numero: number;
  simbolo: string;
  nombre: string;
  categoria: CategoriaId;
  testamento: Testamento;
  dificultad: 1 | 2 | 3;
}

export type TipoPregunta = "identificacion" | "relacion" | "aplicacion" | "tabla";

export interface Pregunta {
  id: string;
  tipo: TipoPregunta;
  dificultad: 1 | 2 | 3;
  tiempoSegundos: number;
  enunciado: string;
  opciones: [string, string, string, string];
  correcta: 0 | 1 | 2 | 3;
  reflexion?: string;
}

export type PowerUp = "fiftyFifty" | "double";

export interface RespuestaJugador {
  preguntaId: string;
  elegida: number | null;
  correcta: boolean;
  msTomados: number;
  puntosObtenidos: number;
  rachaTras: number;
  doubleAplicado: boolean;
}

export interface Jugador {
  id: string;
  nombre: string;
  puntos: number;
  rachaActual: number;
  mejorRacha: number;
  powerUpsDisponibles: { fiftyFifty: boolean; double: boolean };
  doubleArmadoParaSiguiente: boolean;
  respuestas: RespuestaJugador[];
  libroFinalSimbolo?: string;
}

export type FaseJuego =
  | "lobby"
  | "question"
  | "reveal"
  | "leaderboard"
  | "finalRoundLobby"
  | "finalQuestion"
  | "finalReveal"
  | "ended";

export interface PartidaPublica {
  code: string;
  fase: FaseJuego;
  modoFormacion: boolean;
  preguntaIndice: number;
  totalPreguntas: number;
  preguntaActual: PreguntaPublica | null;
  jugadores: JugadorPublico[];
}

/** Pregunta tal como se envía a los jugadores: SIN la respuesta correcta. */
export interface PreguntaPublica {
  id: string;
  tipo: TipoPregunta;
  enunciado: string;
  opciones: [string, string, string, string];
  tiempoSegundos: number;
  inicioMs: number;
  reflexion?: string;
}

export interface JugadorPublico {
  id: string;
  nombre: string;
  puntos: number;
  rachaActual: number;
  conectado: boolean;
}
