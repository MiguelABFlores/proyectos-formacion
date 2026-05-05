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

/** Estado de un libro en el historial personal del jugador. */
export type EstadoLibroPersonal = "correcto" | "incorrecto";

/** Mapa simbolo → estado para todos los libros que el jugador ya jugó. */
export type HistorialPersonal = Record<string, EstadoLibroPersonal>;

export interface RespuestaJugador {
  preguntaId: string;
  /** Símbolo del libro asociado a esta pregunta (siempre, en el flujo de tabla). */
  libroSimbolo: string;
  elegida: number | null;
  correcta: boolean;
  msTomados: number;
  puntosObtenidos: number;
  rachaTras: number;
  doubleAplicado: boolean;
  /** Multiplicador por dificultad del libro elegido (1, 2 o 3). */
  multiplicadorDificultad: 1 | 2 | 3;
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
  /** Libros que el jugador ya eligió en rondas anteriores (no podrá repetir). */
  historial: HistorialPersonal;
}

/**
 * Fases del juego.
 * - lobby: esperando jugadores, host arranca cuando quiere
 * - roundSelection: jugadores eligen un libro de su tabla disponible
 * - roundQuestion: cada jugador contesta la pregunta de su libro elegido
 * - roundReveal: muestra ✓/✗ por jugador, host ve resumen
 * - leaderboard: ranking acumulado
 * - ended: fin de partida con pasaporte personal
 */
export type FaseJuego =
  | "lobby"
  | "roundSelection"
  | "roundQuestion"
  | "roundReveal"
  | "leaderboard"
  | "ended";

export interface PartidaPublica {
  code: string;
  fase: FaseJuego;
  modoFormacion: boolean;
  /** Índice 0-based de la ronda actual. */
  rondaIndice: number;
  /** Número total de rondas configuradas. */
  totalRondas: number;
  jugadores: JugadorPublico[];
}

/** Pregunta tal como se envía al jugador: SIN la respuesta correcta. */
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
  /**
   * Cuántos libros ha jugado este jugador. Útil para que el host muestre
   * progreso sin exponer el historial completo.
   */
  librosJugados: number;
}

/**
 * Resumen por jugador de qué pasó en una ronda concreta.
 * Lo emite el servidor al host para que arme el panel de resumen.
 */
export interface ResumenJugadorRonda {
  jugadorId: string;
  nombre: string;
  libroSimbolo: string | null;
  correcta: boolean;
  puntosObtenidos: number;
  /** Si el jugador no eligió ni respondió, ambos son false. */
  respondio: boolean;
}
