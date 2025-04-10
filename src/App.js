import React, { useEffect, useState } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get } from 'firebase/database';

const firebaseConfig = {
   apiKey: 'AIzaSyCe6fh3eFcMlJoK6qoMHTzgbyHRn1N59Lw',
   authDomain: 'softalyafood.firebaseapp.com',
   databaseURL: 'https://softalyafood-default-rtdb.firebaseio.com',
   projectId: 'softalyafood',
   storageBucket: 'softalyafood.appspot.com',
   messagingSenderId: '758318924440',
   appId: '1:758318924440:web:0a3cb2824d487e3a5e46ed',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const App = () => {
   const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
   const [menuMainInput, setMenuMainInput] = useState('');
   const [menuSideInput, setMenuSideInput] = useState('');
   const [menuMain, setMenuMain] = useState([]);
   const [menuSide, setMenuSide] = useState([]);
   const [selections, setSelections] = useState({});
   const [showMenuInput, setShowMenuInput] = useState(false);
   const [summary, setSummary] = useState('');

   useEffect(() => {
      if (userName) {
         loadMenuFromFirebase();
         loadSelections();
      }
   }, [userName]);

   const loadMenuFromFirebase = () => {
      const menuRef = ref(db, 'menu');
      onValue(menuRef, (snapshot) => {
         const data = snapshot.val() || {};
         setMenuMain(data.main || []);
         setMenuSide(data.side || []);
      });
   };

   const loadSelections = () => {
      const selectionRef = ref(db, 'selections');
      onValue(selectionRef, (snapshot) => {
         setSelections(snapshot.val() || {});
      });
   };

   const saveName = () => {
      if (userName.trim()) {
         localStorage.setItem('userName', userName.trim());
         setUserName(userName.trim());
      }
   };

   const updateMenu = () => {
      const main = menuMainInput.trim().split('\n').filter(Boolean);
      const side = menuSideInput.trim().split('\n').filter(Boolean);
      set(ref(db, 'menu'), { main, side });
   };

   const generateSummary = async () => {
      const snapshot = await get(ref(db, 'selections'));
      const data = snapshot.val() || {};
      const count = {};
      Object.values(data)
         .flat()
         .forEach((item) => {
            count[item] = (count[item] || 0) + 1;
         });
      let output = '';
      for (const item in count) {
         output += `${item} x${count[item]}\n`;
      }
      setSummary(output.trim());
   };

   const copySummary = () => {
      navigator.clipboard.writeText(summary);
      alert('Kopyalandı!');
   };

   const clearUserSelection = () => {
      remove(ref(db, 'selections/' + userName));
   };

   const clearAllSelections = () => {
      if (window.confirm('Tüm seçimler silinecek. Emin misiniz?')) {
         remove(ref(db, 'selections'));
      }
   };

   if (!userName) {
      return (
         <div className="container box">
            <h3>👤 Adınızı Girin</h3>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Adınız" />
            <button onClick={saveName}>Kaydet</button>
         </div>
      );
   }

   const renderMenuList = (items, type) =>
      items.map((item, index) => {
         const userItems = Array.isArray(selections[userName]) ? selections[userName] : [];
         const amount = userItems.filter((i) => i === item).length;
         const isChecked = amount > 0;

         return (
            <div className={`menu-item ${isChecked ? 'checked' : ''}`} key={index}>
               <label>
                  <span>{item}</span>
               </label>
               <div className="checkbox-container">
                  <input
                     type="checkbox"
                     value={item}
                     checked={isChecked}
                     onChange={(e) => {
                        const updated = [...userItems];
                        if (e.target.checked) {
                           updated.push(item);
                        } else {
                           while (updated.includes(item)) {
                              updated.splice(updated.indexOf(item), 1);
                           }
                        }
                        const newSelections = {
                           ...selections,
                           [userName]: updated,
                        };
                        setSelections(newSelections);
                        set(ref(db, 'selections/' + userName), updated);
                     }}
                  />
                  {isChecked && (
                     <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={(e) => {
                           const newAmount = Math.max(1, parseInt(e.target.value || '1'));
                           const updated = [...userItems.filter((i) => i !== item)];
                           for (let i = 0; i < newAmount; i++) updated.push(item);
                           const newSelections = {
                              ...selections,
                              [userName]: updated,
                           };
                           setSelections(newSelections);
                           set(ref(db, 'selections/' + userName), updated);
                        }}
                        style={{ marginLeft: '6px' }}
                     />
                  )}
               </div>
            </div>
         );
      });

   return (
      <div className="container">
         <div className="box" id="menuBox">
            <h3>✅ Menü ve Seçim</h3>
            <h4>Ana Yemekler</h4>
            {renderMenuList(menuMain, 'main')}
            <h4>Ara Yemekler</h4>
            {renderMenuList(menuSide, 'side')}
         </div>

         <div className="box" id="allSelectionsBox">
            <h3>👥 Seçimler</h3>
            {Object.entries(selections).map(([name, items], i) => (
               <p key={i}>
                  <strong>{name}:</strong> {items.join(', ')}
               </p>
            ))}
         </div>

         <div className="box" id="summaryBox">
            <h3>📊 Toplam</h3>
            <pre>{summary}</pre>
            <button onClick={generateSummary}>Toplamı Hesapla</button>
            <button onClick={copySummary}>Kopyala</button>
         </div>

         <div className="box" id="menuControl">
            <button onClick={() => setShowMenuInput(!showMenuInput)}>📋 Menü Ekle / Güncelle</button>
            {showMenuInput && (
               <div>
                  <textarea rows="4" placeholder="Her satıra bir ana yemek girin..." value={menuMainInput} onChange={(e) => setMenuMainInput(e.target.value)} />
                  <textarea rows="4" placeholder="Her satıra bir ara yemek girin..." value={menuSideInput} onChange={(e) => setMenuSideInput(e.target.value)} />
                  <button onClick={updateMenu}>Menüyü Güncelle</button>
               </div>
            )}
         </div>

         <div className="box" id="clearBox">
            <h3>Ayarlar</h3>
            <button
               onClick={() => {
                  localStorage.removeItem('userName');
                  window.location.reload();
               }}
            >
               İsmi Güncelle
            </button>
            <button className="danger" onClick={clearUserSelection}>
               🧍 Sadece Benim Seçimlerimi Temizle
            </button>
            <button className="danger" onClick={clearAllSelections}>
               🚨 Tüm Seçimleri Temizle
            </button>
         </div>
      </div>
   );
};

export default App;
