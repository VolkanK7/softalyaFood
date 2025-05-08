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
   const [toggleUpdateMenu, setToggleUpdateMenu] = useState(false);
   const [summary, setSummary] = useState('');
   const [copied, setCopied] = useState(false);

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

   const updateMenu = async () => {
      const snapshot = await get(ref(db, 'menu'));
      const currentMenu = snapshot.val() || { main: [], side: [] };

      const newMainItems = menuMainInput.trim().split('\n').filter(Boolean);
      const newSideItems = menuSideInput.trim().split('\n').filter(Boolean);

      const updatedMain = Array.from(new Set([...currentMenu.main, ...newMainItems]));
      const updatedSide = Array.from(new Set([...currentMenu.side, ...newSideItems]));

      await set(ref(db, 'menu'), {
         main: updatedMain,
         side: updatedSide,
      });

      setMenuMainInput('');
      setMenuSideInput('');
      alert('Yeni yemekler eklendi.');
   };

   const deleteMenuItem = async (type, item) => {
      const snapshot = await get(ref(db, 'menu'));
      const currentMenu = snapshot.val() || { main: [], side: [] };

      const updatedList = (type === 'main' ? currentMenu.main : currentMenu.side).filter((i) => i !== item);
      await set(ref(db, 'menu'), {
         ...currentMenu,
         [type]: updatedList,
      });
   };

   const updateMenuItemName = async (type, oldName, newName) => {
      if (!newName.trim()) return;
      const snapshot = await get(ref(db, 'menu'));
      const currentMenu = snapshot.val() || { main: [], side: [] };

      const updatedList = (type === 'main' ? currentMenu.main : currentMenu.side).map((i) => (i === oldName ? newName.trim() : i));

      // Seçimlerde de güncelle
      const selectionSnap = await get(ref(db, 'selections'));
      const allSelections = selectionSnap.val() || {};
      const updatedSelections = {};

      Object.entries(allSelections).forEach(([user, items]) => {
         const newItems = {};
         Object.entries(items).forEach(([item, qty]) => {
            if (item === oldName) {
               newItems[newName] = qty;
            } else {
               newItems[item] = qty;
            }
         });
         updatedSelections[user] = newItems;
      });

      await set(ref(db, 'menu'), {
         ...currentMenu,
         [type]: updatedList,
      });

      await set(ref(db, 'selections'), updatedSelections);
   };

   const clearMenu = async () => {
      if (window.confirm('Tüm menü silinecek. Emin misiniz?')) {
         await set(ref(db, 'menu'), { main: [], side: [] });
      }
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
      menuMain.forEach((item) => {
         if (count[item]) {
            output += `${item} x${count[item]}\n`;
         }
      });
      menuSide.forEach((item) => {
         if (count[item]) {
            output += `${item} x${count[item]}\n`;
         }
      });

      setSummary(output.trim());
      return output.trim();
   };

   const copySummary = () => {
      navigator.clipboard.writeText(summary).then(() => {
         setCopied(true);
         setTimeout(() => setCopied(false), 1500);
      });
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

      const orderedSummary = {};
      menuMain.forEach((item) => {
         if (itemSummary[item]) orderedSummary[item] = itemSummary[item];
      });
      menuSide.forEach((item) => {
         if (itemSummary[item]) orderedSummary[item] = itemSummary[item];
      });
      return orderedSummary;
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

   const MenuItemEditor = ({ item, type }) => {
      const [isEditing, setIsEditing] = useState(false);
      const [newName, setNewName] = useState(item);

      return (
         <div style={{ marginBottom: '8px' }}>
            {isEditing ? (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ marginRight: '15px' }} />
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     <button
                        onClick={() => {
                           updateMenuItemName(type, item, newName);
                           setIsEditing(false);
                        }}
                        style={{ width: '120px', height: '50px !important', marginRight: '15px' }}
                     >
                        Kaydet
                     </button>
                     <button onClick={() => setIsEditing(false)} className="danger" style={{ width: '120px', height: '50px !important' }}>
                        İptal
                     </button>
                  </div>
               </div>
            ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>{item}</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     <button onClick={() => setIsEditing(true)} style={{ width: '120px', height: '50px !important', marginRight: '15px' }}>
                        Güncelle
                     </button>
                     <button onClick={() => deleteMenuItem(type, item)} className="danger" style={{ width: '120px', height: '50px !important' }}>
                        Sil
                     </button>
                  </div>
               </div>
            )}
         </div>
      );
   };

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

   const handleWhatsAppClick = async () => {
      console.log('Butona tıklandı');

      const summary = await generateSummary();
      console.log('generateSummary() sonucu:', summary);

      if (!summary || summary.trim() === '') {
         alert('Özet boş, gönderim yapılamıyor.');
         return;
      }

      const message = encodeURIComponent(summary);
      const phoneNumber = '905078204727';
      const url = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

      window.open(url, '_blank');
   };

   const generateSummary2 = async () => {
      const snapshot = await get(ref(db, 'menu'));
      const data = snapshot.val();

      if (!data) return '';

      let summary = '📅 Bugünün Menüsü:\n\n';

      // Ana Yemekler
      if (data.main && data.main.length > 0) {
         summary += '🍽️ Ana Yemekler:\n';
         data.main.forEach((item) => {
            summary += `- ${item}\n`;
         });
         summary += '\n';
      }

      // Ara Yemekler
      if (data.side && data.side.length > 0) {
         summary += '🥗 Ara Öğünler:\n';
         data.side.forEach((item) => {
            summary += `- ${item}\n`;
         });
         summary += '\n';
      }

      summary += '🔗 Daha fazla bilgi: https://softalya-food.vercel.app';

      return summary.trim();
   };

   const handleWhatsAppClick2 = async () => {
      const summary = await generateSummary2();

      if (!summary || summary.trim() === '') {
         alert('Özet boş, gönderim yapılamıyor.');
         return;
      }

      const message = encodeURIComponent(summary);
      const phoneNumber = '905534153473';
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const url = isMobile ? `https://wa.me/${phoneNumber}?text=${message}` : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

      window.open(url, '_blank');
   };

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
                     .map(([itemName, count]) => `${itemName} (${count})`)
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
            <button onClick={handleWhatsAppClick}>WhatsApp ile Gönder</button>
            <button onClick={handleWhatsAppClick2}>WhatsApp ile Paylaş</button>
         </div>

         <div className="box" id="menuControl">
            <h3>📋 Menü Ekle / Güncelle</h3>

            <label>
               <strong>Yeni Ana Yemekler</strong>
            </label>
            <textarea
               rows="15"
               placeholder="Her satıra bir ana yemek..."
               value={menuMainInput}
               onChange={(e) => setMenuMainInput(e.target.value)}
               style={{ width: '97%' }}
            />
            <label>
               <strong>Yeni Ara Yemekler</strong>
            </label>
            <textarea
               rows="15"
               placeholder="Her satıra bir ara yemek..."
               value={menuSideInput}
               onChange={(e) => setMenuSideInput(e.target.value)}
               style={{ width: '97%' }}
            />
            <button style={{ marginLeft: '8px' }} onClick={updateMenu}>
               Yeni Yemekleri Ekle
            </button>
            <button className="danger" style={{ marginLeft: '8px' }} onClick={clearMenu}>
               🚨 Tüm Menüyü Temizle
            </button>

            <hr />
            <button style={{ marginLeft: '8px' }} onClick={() => setToggleUpdateMenu(!toggleUpdateMenu)}>
               Menüyü Güncelle
            </button>
            {toggleUpdateMenu && (
               <div>
                  <h4>🧾 Mevcut Ana Yemekler</h4>
                  {menuMain.map((item, idx) => (
                     <MenuItemEditor key={`main-${idx}`} item={item} type="main" />
                  ))}
                  <h4>🥗 Mevcut Ara Yemekler</h4>
                  {menuSide.map((item, idx) => (
                     <MenuItemEditor key={`side-${idx}`} item={item} type="side" />
                  ))}
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
