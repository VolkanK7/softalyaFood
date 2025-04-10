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

function App() {
   const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
   const [nameInput, setNameInput] = useState('');
   const [menu, setMenu] = useState([]);
   const [selections, setSelections] = useState({});
   const [menuInputVisible, setMenuInputVisible] = useState(false);
   const [menuText, setMenuText] = useState('');
   const [summary, setSummary] = useState('');
   const [userChoices, setUserChoices] = useState({}); // { "yemek adı": adet }

   useEffect(() => {
      if (userName) {
         const menuRef = ref(db, 'menu');
         onValue(menuRef, (snapshot) => {
            setMenu(snapshot.val() || []);
         });

         const selRef = ref(db, 'selections');
         onValue(selRef, (snapshot) => {
            setSelections(snapshot.val() || {});
         });
      }
   }, [userName]);

   const handleSaveName = () => {
      if (nameInput.trim()) {
         localStorage.setItem('userName', nameInput.trim());
         setUserName(nameInput.trim());
      }
   };

   const handleToggleItem = (item) => {
      const updated = { ...userChoices };
      if (updated[item]) {
         delete updated[item];
      } else {
         updated[item] = 1;
      }
      setUserChoices(updated);
   };

   const handleAmountChange = (item, amount) => {
      const updated = { ...userChoices };
      updated[item] = parseInt(amount) || 1;
      setUserChoices(updated);
   };

   const submitSelection = () => {
      const finalList = [];
      for (const item in userChoices) {
         const count = userChoices[item];
         for (let i = 0; i < count; i++) {
            finalList.push(item);
         }
      }
      set(ref(db, `selections/${userName}`), finalList);
   };

   const generateSummary = async () => {
      const snap = await get(ref(db, 'selections'));
      const data = snap.val() || {};
      const count = {};
      for (const user in data) {
         data[user].forEach((item) => {
            count[item] = (count[item] || 0) + 1;
         });
      }
      const lines = Object.entries(count)
         .map(([key, val]) => `${key} x${val}`)
         .join('\n');
      setSummary(lines);
   };

   const copySummary = () => {
      navigator.clipboard.writeText(summary);
      alert('Kopyalandı!');
   };

   const updateMenu = () => {
      const lines = menuText.trim().split('\n').filter(Boolean);
      set(ref(db, 'menu'), lines);
      setMenuText('');
   };

   const clearUserSelection = () => {
      remove(ref(db, `selections/${userName}`));
   };

   const clearAllSelections = () => {
      if (window.confirm('Tüm seçimleri silmek istediğinize emin misiniz?')) {
         remove(ref(db, 'selections'));
      }
   };

   const changeName = () => {
      localStorage.removeItem('userName');
      setUserName('');
      setUserChoices({});
   };

   if (!userName) {
      return (
         <div className="container">
            <div className="box">
               <h3>👤 Adınızı Girin</h3>
               <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Adınız" />
               <button onClick={handleSaveName}>Kaydet</button>
            </div>
         </div>
      );
   }

   return (
      <div className="container">
         <div className="box">
            <h3>✅ Menü ve Seçim</h3>
            <div className="menu-item-container">
               {menu.map((item, i) => {
                  const selected = userChoices[item] !== undefined;
                  return (
                     <div
                        key={i}
                        className={`menu-item ${selected ? 'checked' : ''}`}
                        onClick={(e) => {
                           if (e.target.tagName !== 'INPUT') handleToggleItem(item);
                        }}
                     >
                        <label>
                           <span>{item}</span>
                        </label>
                        <div className="checkbox-container">
                           <input type="checkbox" checked={selected} onChange={() => handleToggleItem(item)} />
                           {selected && <input type="number" min="1" value={userChoices[item]} onChange={(e) => handleAmountChange(item, e.target.value)} />}
                        </div>
                     </div>
                  );
               })}
            </div>
            <button onClick={submitSelection}>Seçimi Kaydet</button>
         </div>

         <div className="box">
            <h3>👥 Seçimler</h3>
            <div>
               {Object.entries(selections).map(([user, list]) => (
                  <p key={user}>
                     <strong>{user}:</strong> {list.join(', ')}
                  </p>
               ))}
            </div>
         </div>

         <div className="box">
            <h3>📊 Toplam</h3>
            <pre>{summary}</pre>
            <button onClick={generateSummary}>Toplamı Hesapla</button>
            <button onClick={copySummary}>Kopyala</button>
         </div>

         <div className="box">
            <button onClick={() => setMenuInputVisible(!menuInputVisible)}>📋 Menü Ekle / Güncelle</button>
            {menuInputVisible && (
               <>
                  <textarea rows="5" value={menuText} onChange={(e) => setMenuText(e.target.value)} placeholder="Her satıra bir yemek girin..." />
                  <button onClick={updateMenu}>Menüyü Güncelle</button>
               </>
            )}
         </div>

         <div className="box">
            <h3>Ayarlar</h3>
            <button onClick={changeName}>İsmi Güncelle</button>
            <button className="danger" onClick={clearUserSelection}>
               🧍 Sadece Benim Seçimlerimi Temizle
            </button>
            <button className="danger" onClick={clearAllSelections}>
               🚨 Tüm Seçimleri Temizle
            </button>
         </div>
      </div>
   );
}

export default App;
