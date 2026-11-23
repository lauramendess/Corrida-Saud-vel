// Parâmetros de balanceamento: altere aqui para ajustar dificuldade e pontuação (Sprint 2)
const CFG={
  START_SCORE:50,        // pontos iniciais (chegar a 0 = fim de jogo)
  GOOD_PTS:10,           // pontos por comida saudável
  BAD_PTS:25,            // pontos perdidos por comida ruim
  MAX_FAT:5,             // níveis de peso; ao atingir, fim de jogo
  STREAK_TO_LOSE_FAT:5,  // saudáveis seguidos para perder 1 nível de peso
  SPEED_START:14, SPEED_MAX:32, SPEED_ACCEL:.35,   // velocidade (m/s) e aceleração por segundo
  LEVEL_EVERY:3,         // a cada +3 m/s sobe um nível
  GOOD_RATIO_START:.55, GOOD_RATIO_MIN:.38,        // chance de item saudável: cai com a dificuldade
  DOUBLE_START:.35, DOUBLE_MAX:.6                  // chance de 2 itens por fileira: sobe com a dificuldade
};
const lerp=(a,b,t)=>a+(b-a)*t;
