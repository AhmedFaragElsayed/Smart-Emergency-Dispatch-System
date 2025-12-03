import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import SigninPage from "./components/SigninPage"

function App() {
  
  return(
    <Router>
      <Routes>
          <Route path="/signin" element={<SigninPage />}/>
      </Routes>
    </Router>
  )
}

export default App
