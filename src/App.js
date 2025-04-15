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
   const [tempUserName, setTempUserName] = useState('');
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
      if (tempUserName.trim()) {
         localStorage.setItem('userName', tempUserName.trim());
         setUserName(tempUserName.trim());
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

      Object.values(data).forEach((userSelections) => {
         Object.entries(userSelections).forEach(([item, quantity]) => {
            count[item] = (count[item] || 0) + quantity;
         });
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

   const generateItemWiseSummary = () => {
      const itemSummary = {};
      Object.entries(selections).forEach(([name, items]) => {
         Object.entries(items).forEach(([item, quantity]) => {
            if (!itemSummary[item]) itemSummary[item] = [];
            itemSummary[item].push(`${name} (${quantity})`);
         });
      });
      return itemSummary;
   };

   if (!userName) {
      return (
         <div className="container box">
            <h3>👤 Adınızı Girin</h3>
            <input value={tempUserName} onChange={(e) => setTempUserName(e.target.value)} placeholder="Adınız" />
            <button onClick={saveName}>Kaydet</button>
         </div>
      );
   }

   const renderMenuList = (items, type) =>
      items.map((item, index) => {
         const userSelection = selections[userName] || {};
         const quantity = userSelection[item] || 0;

         const handleToggle = () => {
            const updated = { ...userSelection };
            if (quantity > 0) {
               delete updated[item];
            } else {
               updated[item] = 1;
            }
            setSelections((prev) => ({
               ...prev,
               [userName]: updated,
            }));
            set(ref(db, `selections/${userName}`), updated);
         };

         return (
            <div className={`menu-item ${quantity > 0 ? 'checked' : ''}`} key={index} onClick={handleToggle} style={{ cursor: 'pointer' }}>
               <label>
                  <span
                     onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(item)}`, '_blank');
                     }}
                     style={{ textDecoration: 'underline', cursor: 'pointer', marginRight: '8px' }}
                  >
                     {item}
                  </span>
               </label>
               <div
                  className="checkbox-container"
                  onClick={(e) => e.stopPropagation()} // checkbox içi tıklamayı engelle
               >
                  <input type="checkbox" checked={quantity > 0} onChange={handleToggle} />
                  {quantity > 0 && (
                     <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                           const newQuantity = Math.max(1, parseInt(e.target.value || '1'));
                           const updated = {
                              ...userSelection,
                              [item]: newQuantity,
                           };
                           setSelections((prev) => ({
                              ...prev,
                              [userName]: updated,
                           }));
                           set(ref(db, `selections/${userName}`), updated);
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
            <h3>👥 Kişiye Göre Dağılım</h3>
            {Object.entries(selections).map(([name, items], i) => (
               <p key={i}>
                  <strong>{name}:</strong>{' '}
                  {Object.entries(items)
                     .map(([itemName, count]) => `${itemName} x${count}`)
                     .join(', ')}
               </p>
            ))}
            <hr />

            <h3>🍽 Yemeğe Göre Dağılım</h3>
            {Object.entries(generateItemWiseSummary()).map(([item, users], i) => (
               <p key={i}>
                  <strong>{item}:</strong> {users.join(', ')}
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
                  <label>
                     <strong>Ana Yemekler</strong>
                  </label>
                  <textarea rows="4" placeholder="Her satıra bir ana yemek girin..." value={menuMainInput} onChange={(e) => setMenuMainInput(e.target.value)} />
                  <label>
                     <strong>Ara Yemekler</strong>
                  </label>
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
