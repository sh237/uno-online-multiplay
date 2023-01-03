import './App.css';
import Game from './Game.js'
import Join from './Join.js'
import Room from './Room.js'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Context from './Context.js'

const App = () => {
  return (
    <Context>
      <BrowserRouter>
        <Routes>
          <Route path={`/`} element={<Join />} />
          <Route path={`/Room`} element={<Room />} />
          <Route path={`/Game`} element={<Game />} />
        </Routes>
      </BrowserRouter>
    </Context>
  );
}

export default App;
