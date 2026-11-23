# Corrida Saudável 3D

Endless runner 3D: o personagem corre sozinho; o jogador troca de pista e pula para **coletar comida saudável** (frutas, verduras, carnes grelhadas) e **evitar comida ruim** (hambúrguer, rosquinha, refrigerante, batata frita).

## Tecnologia e justificativa
**JavaScript + HTML5 + Three.js (WebGL):** A escolha dessas tecnologias permite desenvolver um jogo 3D diretamente para navegadores, sem a necessidade de instalação de programas adicionais, tornando o acesso mais simples e amplo. O HTML5 fornece a estrutura da aplicação, enquanto o JavaScript é responsável pela lógica, pelas mecânicas e pela interação do jogador. A biblioteca Three.js facilita a criação e a renderização de ambientes e objetos tridimensionais por meio do WebGL, reduzindo a complexidade do desenvolvimento gráfico. Além disso, a utilização da Web Audio API possibilita a criação e reprodução de efeitos sonoros diretamente pelo navegador, sem depender de arquivos de áudio externos, contribuindo para uma aplicação mais leve e independente.

## Como abrir
Para iniciar, abra o arquivo **index.html**, que corresponde ao menu inicial do jogo.
Ao clicar no botão Jogar, você será redirecionado para o arquivo **jogo.html**, onde a partida será iniciada.

## Estrutura
```
index.html          MENU (página separada): logo, botão Jogar, dificuldade (setas), Regras (janela), som e recorde
jogo.html           JOGO: HUD, telas de pausa e fim de jogo
css/menu.css        estilos do menu 
css/style.css       estilos do jogo
js/config.js        constantes de balanceamento (CFG): ajuste dificuldade aqui
js/settings.js      dificuldades, recorde por dificuldade, estatísticas e som
js/menu.js          lógica da página do menu
js/menu-fundo.js    fundo 3D do menu: carrega Three.js + a rua do jogo depois da página
js/audio.js         efeitos sonoros (Sfx) + música de fundo gerada por código (Musica)
js/engine.js        renderer, câmera, luzes
js/textures.js      texturas procedurais desenhadas em canvas (asfalto, calçada, grama, tijolo, fachadas, lojas, casca e folhagem de árvore...)
js/scenery.js       construtor de cubos (Batch) + objetos: prédios, casas, sobrados, postes, bancos, árvores, cercas...
js/world.js         monta 4 trechos de 40 m (pista, calçadas, grama, lotes) que rolam e são reciclados
js/player.js        personagem articulado (braços, pernas, joelhos, cotovelos) e animaPersonagem()
js/foods.js         alimentos (boas e ruins)
js/game.js          estado, HUD, spawn, comer, fim de jogo
js/input.js         teclado e toque
js/telas.js         pausa (P/Esc), fim de jogo, contagem 3-2-1 e volta ao menu
js/main.js          laço principal
tests/teste-regras.js   testes das regras (node tests/teste-regras.js)
```
