export type GameState = {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
  };
  paddleLeft: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  paddleRight: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: {
    left: number;
    right: number;
  };
};
