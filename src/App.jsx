import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react"; 
import { supabase } from "./supabaseclient";

// ==========================================
// BACKEND SUNUCU ADRESİ
// ==========================================
const BACKEND_URL = "https://alicci-backend.onrender.com"; 

// Hızlı Kısayol Butonları
const quickActions = [
  { key: 'tracking', label: '📦 Kargo Takibi' },
  { key: 'size', label: '📏 Beden Rehberi' },
  { key: 'returns', label: '🔄 İade & Değişim' }
];

// ==========================================
// AKILLI ALICCI DESTEK CHATBOT BİLEŞENİ
// ==========================================
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Merhaba! ALICCI Destek Asistanı'na hoş geldiniz. Siparişiniz, kargo takibi, beden ölçüleri veya iade koşulları hakkında size nasıl yardımcı olabilirim?"
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // AI Yanıt Vermezse veya Bağlantı Koparsa Devreye Girecek Yedek Kural Motoru
  const generateFallbackResponse = (userText) => {
    const text = userText.toLowerCase();

    if (text.includes('alc-') || text.match(/alc\d+/)) {
      const code = userText.toUpperCase().trim();
      return `**${code}** kodlu siparişinizi Kargo Takip panelimizden anlık olarak sorgulayabilirsiniz. Dilerseniz üst menüdeki "Kargo Takip" butonunu kullanabilirsiniz.`;
    }

    if (text.includes('kargo') || text.includes('teslimat') || text.includes('nerede')) {
      return 'Sipariş durumunuzu öğrenmek için **ALC-XXXXXX** formatındaki sipariş kodunuzu buraya yazabilir veya üst menüdeki "Kargo Takip" ekranını kullanabilirsiniz.';
    }

    if (text.includes('beden') || text.includes('kalıp') || text.includes('boy')) {
      return 'ALICCI ürünleri oversize/modern kesimdir. Ürün detay sayfasındaki **"📐 Bedenimi Bul"** sihirbazını kullanarak boy ve kilonuza en uygun bedeni hesaplayabilirsiniz.';
    }

    if (text.includes('iade') || text.includes('değişim') || text.includes('iptal')) {
      return 'Teslim aldığınız ürünleri **14 gün** içerisinde ücretsiz iade edebilir veya beden değişimi talep edebilirsiniz. Ürünün kullanılmamış olması gerekmektedir.';
    }

    if (text.includes('kumaş') || text.includes('kalite') || text.includes('yıkama')) {
      return 'Ürünlerimiz %100 birinci sınıf pamuklu kumaşlardan üretilmektedir. 30°C sıcaklıkta, ters çevirerek yıkamanız tavsiye edilir.';
    }

    if (text.includes('iletişim') || text.includes('temsilci') || text.includes('whatsapp') || text.includes('dm')) {
      return 'Müşteri temsilcilerimize WhatsApp veya Instagram DM üzerinden doğrudan ulaşabilirsiniz. Sayfanın altındaki iletişim butonlarını kullanabilirsiniz.';
    }

    return 'Mesajınızı aldım! Size daha iyi yardımcı olabilmem için kargo kodu (ALC-...), beden, iade veya kumaş kalitesi hakkında bir soru sorabilirsiniz.';
  };

  const handleSend = async (textToSend) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: messageText };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botReply = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply || generateFallbackResponse(messageText)
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        throw new Error("AI Yanıtı Alınamadı");
      }
    } catch (err) {
      console.warn("AI Backend yanıt vermedi, yerel kural motoruna geçiliyor:", err);
      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: generateFallbackResponse(messageText)
      };
      setMessages((prev) => [...prev, botReply]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999999, fontFamily: 'sans-serif' }}>
      
      {/* 1. Chat Penceresi (Geçiş Animasyonlu) */}
      <div style={{
        position: 'absolute',
        bottom: '70px',
        right: '0',
        width: '340px',
        height: '480px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        border: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        pointerEvents: isOpen ? 'all' : 'none',
        transformOrigin: 'bottom right',
        transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#000', color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', color: '#fff' }}>ALICCI AI ASSISTANT</h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }}></span>
              Çevrimiçi • AI Destekli
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '16px', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Mesaj Alanı */}
        <div style={{ flex: 1, padding: '14px', overflowY: 'auto', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  lineHeight: '1.4',
                  backgroundColor: msg.sender === 'user' ? '#000' : '#fff',
                  color: msg.sender === 'user' ? '#fff' : '#111',
                  border: msg.sender === 'user' ? 'none' : '1px solid #eee',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                }}
              >
                {msg.text.split('**').map((part, idx) => 
                  idx % 2 === 1 ? <strong key={idx} style={{ fontWeight: 'bold' }}>{part}</strong> : part
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '8px 12px', borderRadius: '12px', color: '#888' }}>
                Yazıyor...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hızlı Kısayollar */}
        <div style={{ padding: '8px', backgroundColor: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleSend(action.label)}
              style={{
                fontSize: '11px',
                backgroundColor: '#f0f0f0',
                color: '#333',
                padding: '6px 12px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input Alanı */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          style={{ padding: '10px', backgroundColor: '#fff', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir soru sorun veya ALC- kargo kodu..."
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#f4f4f4',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '12px',
              outline: 'none',
              color: '#000'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              opacity: !input.trim() ? 0.4 : 1,
              fontSize: '12px'
            }}
          >
            Gönder
          </button>
        </form>

      </div>

      {/* 2. Açma/Kapama Balon Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#000',
          color: '#fff',
          borderRadius: '50%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: '1px solid #333',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          float: 'right'
        }}
        aria-label="Sohbeti Aç/Kapat"
      >
        {isOpen ? (
          <svg style={{ width: '22px', height: '22px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

    </div>
  );
}

// ==========================================
// YARDIMCI FONKSİYONLAR & BİLEŞENLER
// ==========================================
const getRecommendedSize = (height, weight, fitPreference) => {
    let baseSize = "M";

    if (height <= 168 && weight <= 54) {
        baseSize = "S"; 
    } else if (height <= 176 && weight <= 68) {
        baseSize = "M"; 
    } else if (height <= 184 && weight <= 82) {
        baseSize = "L"; 
    } else {
        baseSize = "XL"; 
    }

    if (fitPreference === "oversize") {
        if (baseSize === "S") return "M";
        if (baseSize === "M") return "L";
        if (baseSize === "L") return "XL";
        return "XXL";
    }

    return baseSize;
};

const ProductCard = ({ product, openProductModal, closeCart }) => {
    const [hoveredImageIndex, setHoveredImageIndex] = useState(0);

    const handleMouseMove = (e) => {
        if (!product || !product.image || product.image.length <= 1) {
            setHoveredImageIndex(0);
            return;
        }

        const { currentTarget } = e;
        const { left, width } = currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const segmentWidth = width / product.image.length;
        let newIndex = Math.floor(mouseX / segmentWidth);
        newIndex = Math.max(0, Math.min(newIndex, product.image.length - 1));

        if (newIndex !== hoveredImageIndex) {
            setHoveredImageIndex(newIndex);
        }
    };

    const handleMouseLeave = () => {
        setHoveredImageIndex(0);
    };

    const handleClick = () => {
        if (closeCart) closeCart();
        openProductModal(product);
    };

    const isCompletelySoldOut = product.stock === 0;

    return (
        <div
            className={`product-card reveal ${isCompletelySoldOut ? "sold-out" : ""}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {isCompletelySoldOut && <div className="sold-out-badge">TÜKENDİ</div>}
            <img
                src={product.image ? product.image[hoveredImageIndex] : "/logo.png"}
                alt={product.name}
                className="product-card-image"
                loading="lazy"
            />
            <div className="info">
                <h4>{product.name}</h4>
                <p>{product.price} TL</p>
            </div>
        </div>
    );
};

// ==========================================
// ANA UYGULAMA BİLEŞENİ (APP)
// ==========================================
function App() {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isProductClosing, setIsProductClosing] = useState(false);
    const [selectedSize, setSelectedSize] = useState("");
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCartClosing, setIsCartClosing] = useState(false); 
    const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
    const [showOrderOptionsModal, setShowOrderOptionsModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [isTrackingClosing, setIsTrackingClosing] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false); 
    const [currentSection, setCurrentSection] = useState("home");
    const [isLoading, setIsLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    const [showSizeCalcModal, setShowSizeCalcModal] = useState(false);
    const [isSizeCalcClosing, setIsSizeCalcClosing] = useState(false);
    const [modalTiltStyle, setModalTiltStyle] = useState({});
    
    const [calcHeight, setCalcHeight] = useState(170);
    const [calcWeight, setCalcWeight] = useState(65);
    const [calcFit, setCalcFit] = useState("oversize");
    const [calcResult, setCalcResult] = useState(null);
    
    const [couponInput, setCouponInput] = useState("");
    const [discount, setDiscount] = useState(0);
    const [appliedCouponCode, setAppliedCouponCode] = useState(""); 
    
    const [toast, setToast] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const [trackingCodeInput, setTrackingCodeInput] = useState("");
    const [searchedOrder, setSearchedOrder] = useState(null);
    const [trackingError, setTrackingError] = useState("");
    const [isTrackingLoading, setIsTrackingLoading] = useState(false);

    // Iyzico Entegrasyon State'leri
    const [showIyzicoModal, setShowIyzicoModal] = useState(false);
    const [isIyzicoClosing, setIsIyzicoClosing] = useState(false);
    const [isIyzicoLoading, setIsIyzicoLoading] = useState(false);
    const [iyzicoFormHtml, setIyzicoFormHtml] = useState("");

    const form = useRef();

    const WHATSAPP_NUMBER = "905511903118";
    const INSTAGRAM_USERNAME = "alicci.official";

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (BACKEND_URL) {
            console.log("Backend uyandırma sinyali gönderiliyor...");
            fetch(BACKEND_URL)
                .then((res) => {
                    if (res.ok) {
                        console.log("Backend başarıyla uyandırıldı ve hazır! ⚡");
                    }
                })
                .catch((err) => {
                    console.warn("Backend uyandırılırken bir sorun oluştu:", err);
                });
        }
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                }
            });
        }, { threshold: 0.05 });

        const revealElements = document.querySelectorAll(".reveal");
        revealElements.forEach((el) => observer.observe(el));

        return () => {
            revealElements.forEach((el) => observer.unobserve(el));
        };
    }, [products, isLoading]);

    useEffect(() => {
        setDiscount(0);
        setCouponInput("");
        setAppliedCouponCode("");
    }, [cartItems]);

    useEffect(() => {
        const preventInstallPrompt = (e) => {
            e.preventDefault();
        };
        window.addEventListener("beforeinstallprompt", preventInstallPrompt);
        return () => window.removeEventListener("beforeinstallprompt", preventInstallPrompt);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem("darkMode") === "true";
        setIsDarkMode(savedTheme);
        if (savedTheme) {
            document.body.classList.add("dark-mode");
        }
    }, []);

    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem("darkMode", newTheme);
        if (newTheme) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from("products").select("*");
            if (error) {
                console.error("Ürünler çekilirken hata oluştu:", error);
            } else {
                const normalizedData = (data || []).map(prod => {
                    let finalImages = ["/logo.png"]; 
                    const rawImg = prod.image_url || prod.image;
                    
                    if (rawImg) {
                        if (Array.isArray(rawImg)) {
                            finalImages = rawImg;
                        } else if (typeof rawImg === "string") {
                            if (rawImg.startsWith("[") && rawImg.endsWith("]")) {
                                try {
                                    finalImages = JSON.parse(rawImg);
                                } catch (e) {
                                    finalImages = [rawImg];
                                }
                            } else {
                                finalImages = [rawImg];
                            }
                        }
                    }

                    let finalSoldOutSizes = [];
                    if (prod.sold_out_sizes) {
                        if (Array.isArray(prod.sold_out_sizes)) {
                            finalSoldOutSizes = prod.sold_out_sizes;
                        } else if (typeof prod.sold_out_sizes === "string") {
                            if (prod.sold_out_sizes.startsWith("[") && prod.sold_out_sizes.endsWith("]")) {
                                try {
                                    finalSoldOutSizes = JSON.parse(prod.sold_out_sizes);
                                } catch (e) {
                                    finalSoldOutSizes = prod.sold_out_sizes.split(",").map(s => s.trim());
                                }
                            } else {
                                finalSoldOutSizes = prod.sold_out_sizes.split(",").map(s => s.trim());
                            }
                        }
                    }
                    
                    return {
                        ...prod,
                        image: finalImages,
                        sold_out_sizes: finalSoldOutSizes,
                        stock: prod.stock !== undefined ? Number(prod.stock) : 10
                    };
                });
                setProducts(normalizedData);
            }
            setIsLoading(false);
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        const storedCartItems = localStorage.getItem("alicciCartItems");
        if (storedCartItems) {
            try {
                setCartItems(JSON.parse(storedCartItems));
            } catch (e) {
                console.error("Sepet verisi yüklenirken hata:", e);
                localStorage.removeItem("alicciCartItems");
            }
        }
    }, []);
    
    useEffect(() => {
        localStorage.setItem("alicciCartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    useEffect(() => {
        const isAnyModalOpen = selectedProduct || showOrderOptionsModal || showConfirmationModal || showTrackingModal || isCartOpen || isMobileMenuOpen || showSizeCalcModal || isSizeCalcClosing || showIyzicoModal || isIyzicoClosing;
        if (isAnyModalOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [selectedProduct, showOrderOptionsModal, showConfirmationModal, showTrackingModal, isCartOpen, isMobileMenuOpen, showSizeCalcModal, isSizeCalcClosing, showIyzicoModal, isIyzicoClosing]);

    useEffect(() => {
        if (!showIyzicoModal || !iyzicoFormHtml) return;

        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        const srcRegex = /src=["'](.*?)["']/i;
        let match;
        const scriptsToAppend = [];

        while ((match = scriptRegex.exec(iyzicoFormHtml)) !== null) {
            const scriptEl = document.createElement("script");
            scriptEl.type = "text/javascript";
            
            const srcMatch = match[0].match(srcRegex);
            if (srcMatch && srcMatch[1]) {
                scriptEl.src = srcMatch[1];
            } else {
                scriptEl.text = match[1];
            }
            scriptsToAppend.push(scriptEl);
        }

        scriptsToAppend.forEach((script) => {
            document.body.appendChild(script);
        });

        return () => {
            scriptsToAppend.forEach((script) => {
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
            });
        };
    }, [iyzicoFormHtml, showIyzicoModal]);

    const openProductModal = (product) => {
        setSelectedProduct(product);
        setIsProductClosing(false);
        setCurrentModalImageIndex(0);
        setSelectedSize("");
    };

    const closeProductModal = () => {
        setIsProductClosing(true);
        setTimeout(() => {
            setSelectedProduct(null);
            setIsProductClosing(false);
        }, 300);
    };

    const closeSizeCalcModal = () => {
        setIsSizeCalcClosing(true);
        setTimeout(() => {
            setShowSizeCalcModal(false);
            setIsSizeCalcClosing(false);
            setModalTiltStyle({}); 
        }, 300);
    };

    const handleModalMouseMove = (e) => {
        const card = e.currentTarget;
        const box = card.getBoundingClientRect();
        const x = e.clientX - box.left - box.width / 2;
        const y = e.clientY - box.top - box.height / 2;
        
        const rotateX = -(y / (box.height / 2)) * 6;
        const rotateY = (x / (box.width / 2)) * 6;
        
        setModalTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`,
            transition: "transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)"
        });
    };

    const handleModalMouseLeave = () => {
        setModalTiltStyle({
            transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
            transition: "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)"
        });
    };

    const nextModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex + 1) % selectedProduct.image.length
            );
        }
    };

    const prevModalImage = (e) => {
        e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex - 1 + selectedProduct.image.length) % selectedProduct.image.length
            );
        }
    };

    const handleAddToCart = () => {
        if (!selectedSize) {
            showToast("Lütfen bir beden seçin.");
            return;
        }
        if (selectedProduct) {
            const isSizeSoldOut = selectedProduct.sold_out_sizes?.includes(selectedSize);
            if (selectedProduct.stock === 0 || isSizeSoldOut) {
                showToast("Bu ürün veya beden maalesef tükendi.");
                return;
            }

            const existingItemIndex = cartItems.findIndex(
                (item) => item.id === selectedProduct.id && item.size === selectedSize
            );

            if (existingItemIndex > -1) {
                const updatedCartItems = [...cartItems];
                updatedCartItems[existingItemIndex].quantity += 1;
                setCartItems(updatedCartItems);
            } else {
                setCartItems([
                    ...cartItems,
                    { ...selectedProduct, quantity: 1, size: selectedSize },
                ]);
            }
            closeProductModal();
            setIsCartOpen(true);
        }
    };

    const removeFromCart = (itemToRemove) => {
        const uniqueId = `${itemToRemove.id}-${itemToRemove.size}`;
        setRemovingId(uniqueId);

        setTimeout(() => {
            setCartItems(
                cartItems.filter(
                    (item) => !(item.id === itemToRemove.id && item.size === itemToRemove.size)
                )
            );
            setRemovingId(null);
            showToast("Ürün sepetten kaldırıldı.");
        }, 400);
    };

    const closeCart = () => {
        setIsCartClosing(true);
        setTimeout(() => {
            setIsCartOpen(false);
            setIsCartClosing(false);
        }, 300);
    };

    const handleApplyCoupon = async () => {
        const cleanInput = couponInput.trim(); 
        if (!cleanInput) return;

        const today = new Date().toISOString().split('T')[0]; 

        const { data, error } = await supabase
            .from("coupons")
            .select("*")
            .ilike("code", cleanInput);

        if (error || !data || data.length === 0) {
            setDiscount(0);
            setAppliedCouponCode("");
            showToast("Geçersiz kupon kodu!");
            return;
        }

        const coupon = data[0];

        if (!coupon.is_active) {
            setDiscount(0);
            setAppliedCouponCode("");
            showToast("Bu kupon artık geçerli değil!");
            return;
        }

        if (coupon.is_used) {
            setDiscount(0);
            setAppliedCouponCode("");
            showToast("Bu kupon kodu daha önce kullanılmış!");
            return;
        }

        if (coupon.expiry_date && coupon.expiry_date < today) {
            setDiscount(0);
            setAppliedCouponCode("");
            showToast("Bu kuponun son kullanma tarihi geçmiş!");
            return;
        }

        const discountValue = coupon.discount_percentage / 100;
        setDiscount(discountValue);
        setAppliedCouponCode(coupon.code);
        showToast(`Kupon başarıyla uygulandı! %${coupon.discount_percentage} İndirim kazandınız.`);
    };
    
    const getTotalPrice = () => {
        const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
        const finalTotal = subtotal - (subtotal * discount);
        return Number.isInteger(finalTotal) ? finalTotal : finalTotal.toFixed(2);
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            showToast("Sepetiniz boş.");
            return;
        }

        setIsIyzicoLoading(true);
        setShowIyzicoModal(true);
        setIsIyzicoClosing(false);
        closeCart();

        try {
            const response = await fetch(`${BACKEND_URL}/api/iyzico-checkout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cartItems,
                    totalPrice: getTotalPrice(),
                    discount,
                    appliedCouponCode
                }),
            });

            if (!response.ok) {
                throw new Error("Ödeme oturumu başlatılamadı.");
            }

            const data = await response.json();
            
            if (data && data.checkoutFormContent) {
                setIyzicoFormHtml(data.checkoutFormContent);
            } else {
                throw new Error("Ödeme form içeriği alınamadı.");
            }
        } catch (error) {
            console.error("Iyzico hatası:", error);
            showToast("Ödeme sistemi yüklenirken hata oluştu.");
            setShowIyzicoModal(false);
        } finally {
            setIsIyzicoLoading(false);
        }
    };

    const closeIyzicoModal = () => {
        setIsIyzicoClosing(true);
        setTimeout(() => {
            setShowIyzicoModal(false);
            setIsIyzicoClosing(false);
            setIyzicoFormHtml("");
        }, 300);
    };

    const closeOrderOptionsModal = () => {
        setShowOrderOptionsModal(false);
    };

    const openTrackingModal = () => {
        setShowTrackingModal(true);
        setIsTrackingClosing(false);
        setSearchedOrder(null);
        setTrackingCodeInput("");
        setTrackingError("");
    };

    const closeTrackingModal = () => {
        setIsTrackingClosing(true);
        setTimeout(() => {
            setShowTrackingModal(false);
            setIsTrackingClosing(false);
        }, 300);
    };

    const generateOrderCode = () => {
        return `ALC-${Math.floor(100000 + Math.random() * 900000)}`;
    };

    const handleCreateOrder = async (platform) => {
        if (cartItems.length === 0) return;

        const orderCode = generateOrderCode();
        const totalPrice = getTotalPrice();

        const { error } = await supabase.from("orders").insert([
            {
                order_code: orderCode,
                cart_items: cartItems,
                total_price: totalPrice,
                status: "Onay Bekleniyor"
            }
        ]);

        if (error) {
            console.error("Sipariş kaydedilirken hata oluştu:", error);
            showToast("Bir hata oluştu, lütfen tekrar deneyin.");
            return;
        }

        if (appliedCouponCode) {
            const { error: couponError } = await supabase
                .from('coupons')
                .update({ 
                    is_used: true, 
                    used_at: new Date().toISOString()
                })
                .eq('code', appliedCouponCode);

            if (couponError) {
                console.error("Kupon güncellenirken bir hata oluştu:", couponError);
            }
        }

        if (platform === "whatsapp") {
            const message = `Merhaba, ${orderCode} kodlu siparişimi onaylamak istiyorum:\n\n` +
                `${cartItems.map(item => `- ${item.name} (${item.size}) x${item.quantity}`).join('\n')}\n\n` +
                `Toplam: ${totalPrice} TL`;
            
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            navigator.clipboard.writeText(orderCode);
            showToast(`Sipariş kodunuz (${orderCode}) kopyalandı! DM'den bize iletebilirsiniz.`);
            setTimeout(() => {
                window.open(`https://www.instagram.com/${INSTAGRAM_USERNAME}`, '_blank');
            }, 1500);
        }

        setShowOrderOptionsModal(false);
        openConfirmationModal();
    };

    const handleTrackOrder = async () => {
        if (!trackingCodeInput.trim()) {
            setTrackingError("Lütfen sipariş kodunuzu girin.");
            return;
        }
        
        let cleanCode = trackingCodeInput.replace(/\s+/g, '').toUpperCase().replace(/-/g, '');
        
        if (!cleanCode.startsWith('ALC')) {
            cleanCode = 'ALC' + cleanCode;
        }
        
        if (cleanCode.length > 3 && cleanCode[3] !== '-') {
            cleanCode = cleanCode.slice(0, 3) + '-' + cleanCode.slice(3);
        }

        setIsTrackingLoading(true);
        setTrackingError("");
        setSearchedOrder(null);

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("order_code", cleanCode);

        setIsTrackingLoading(false);

        if (error || !data || data.length === 0) {
            setTrackingError("Sipariş bulunamadı. Lütfen kodu kontrol edin (Örn: ALC-123456).");
            return;
        }

        setSearchedOrder(data[0]);
    };

    const handleContactFormSubmit = async (e) => {
        e.preventDefault();

        try {
            await emailjs.sendForm(
                "service_iyppib9",
                "template_ftuypl8",
                form.current,
                "5dI_FI0HT2oHrlQj5"
            );
            showToast("Mesajınız başarıyla gönderildi!");
            e.target.reset();
        } catch (error) {
            console.error("Mesaj gönderilirken hata oluştu:", error);
            showToast("Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    const openConfirmationModal = () => {
        setShowConfirmationModal(true);
    };

    const closeConfirmationModal = () => {
        setShowConfirmationModal(false);
    };

    const closeMobileMenu = () => {
        if (!isMobileMenuOpen) return;
        setIsMobileMenuClosing(true);
        setTimeout(() => {
            setIsMobileMenuOpen(false);
            setIsMobileMenuClosing(false);
        }, 350);
    };

    const toggleMobileMenu = () => {
        if (isMobileMenuOpen) {
            closeMobileMenu();
        } else {
            setIsMobileMenuOpen(true);
        }
    };

    const handleNavLinkClick = (sectionId, customAction = null) => {
        if (customAction) {
            customAction();
        } else {
            setCurrentSection(sectionId);
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        if (isMobileMenuOpen) {
            closeMobileMenu(); 
        }
    };

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slide-up { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                @keyframes slide-down { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(0.95) translateY(20px); opacity: 0; } }
                @keyframes cart-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

                @keyframes avatar-breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.04); }
                }

                @keyframes avatar-head-bob {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }

                @keyframes avatar-arm-sway-left {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-8deg); }
                }

                @keyframes avatar-arm-sway-right {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(8deg); }
                }

                .avatar-breathing-layer {
                    animation: avatar-breathe 2s ease-in-out infinite;
                    transform-origin: bottom center;
                }
                .avatar-head {
                    animation: avatar-head-bob 2s ease-in-out infinite;
                    transform-origin: 18px 11px;
                }
                .avatar-arm-left {
                    animation: avatar-arm-sway-left 2s ease-in-out infinite;
                    transform-origin: 8.5px 22.5px;
                }
                .avatar-arm-right {
                    animation: avatar-arm-sway-right 2s ease-in-out infinite;
                    transform-origin: 27.5px 22.5px;
                }

                .product-card.reveal {
                    opacity: 0;
                    transform: translateY(40px) scale(0.98);
                    transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                }
                .product-card.reveal.active {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }

                .product-card.sold-out {
                    opacity: 0.55;
                }
                .sold-out-badge {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    background-color: #ff3b30;
                    color: #fff;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 5px 10px;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    z-index: 10;
                    border-radius: 2px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                }
                .size-select button.size-sold-out {
                    opacity: 0.35;
                    text-decoration: line-through;
                    position: relative;
                    cursor: not-allowed;
                    background-color: rgba(0,0,0,0.05);
                }
                body.dark-mode .size-select button.size-sold-out {
                    background-color: rgba(255,255,255,0.05);
                }

                .marquee-wrapper {
                    width: 100%;
                    overflow: hidden;
                    background-color: #000;
                    color: #fff;
                    padding: 10px 0;
                    user-select: none;
                    display: flex;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                body.dark-mode .marquee-wrapper {
                    background-color: #111;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .marquee-track {
                    display: flex;
                    width: max-content;
                    animation: marquee-anim 25s linear infinite;
                }
                .marquee-track span {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 2.5px;
                    text-transform: uppercase;
                    white-space: nowrap;
                    padding-right: 40px;
                    flex-shrink: 0;
                }
                @keyframes marquee-anim {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                .backdrop-blur-sm {
                    backdrop-filter: blur(4px) !important;
                    -webkit-backdrop-filter: blur(4px) !important;
                }

                nav, html body nav {
                    display: flex !important;
                    flex-direction: row !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    width: 100% !important;
                    padding: 15px 20px !important;
                    box-sizing: border-box !important;
                    background-color: #fff !important;
                    position: relative !important;
                    z-index: 999999 !important;
                }
                body.dark-mode nav, html body.dark-mode nav {
                    background-color: #111 !important;
                }
                nav h1 {
                    margin: 0 !important;
                    font-size: 24px !important;
                }

                .cart-panel { z-index: 1000001 !important; }
                .cart-panel.closing { animation: cart-slide-out 0.3s ease forwards !important; }
                .toast-container { z-index: 9999999 !important; }

                .tracking-search-box {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 10px !important;
                    width: 100% !important;
                    margin-bottom: 15px !important;
                    box-sizing: border-box !important;
                }
                .tracking-search-box input {
                    flex: 1 !important;
                    width: 100% !important;
                    min-width: 120px !important;
                    padding: 12px !important;
                    border: 1px solid #ccc !important;
                    border-radius: 4px !important;
                    color: #000 !important;
                    background-color: #fff !important;
                    user-select: text !important;
                    -webkit-user-select: text !important;
                    pointer-events: auto !important;
                    box-sizing: border-box !important;
                }
                .tracking-search-box button {
                    width: auto !important;
                    padding: 12px 25px !important;
                    background: #000 !important;
                    color: #fff !important;
                    border: none !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                    box-sizing: border-box !important;
                }
                body.dark-mode .tracking-search-box button {
                    background: #fff !important;
                    color: #000 !important;
                }

                .animated-truck-road {
                    position: relative;
                    width: 100%;
                    height: 40px;
                    background: rgba(128, 128, 128, 0.08);
                    border-radius: 6px;
                    margin-top: 15px;
                    overflow: hidden;
                }
                .animated-truck-road::before {
                    content: "";
                    position: absolute;
                    bottom: 8px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: repeating-linear-gradient(90deg, #ccc, #ccc 10px, transparent 10px, transparent 20px);
                }
                body.dark-mode .animated-truck-road::before {
                    background: repeating-linear-gradient(90deg, #555, #555 10px, transparent 10px, transparent 20px);
                }
                .animated-truck {
                    position: absolute;
                    bottom: 10px;
                    left: -50px;
                    animation: truck-drive 10s linear infinite;
                    display: flex;
                    align-items: center;
                }
                .animated-truck.waiting {
                    left: 20px !important; 
                    animation: none !important;
                }
                .animated-truck svg {
                    animation: truck-bounce 0.4s ease-in-out infinite alternate;
                }
                .animated-truck.waiting svg {
                    animation: truck-idle 0.25s ease-in-out infinite alternate;
                }
                @keyframes truck-drive {
                    0% { left: -50px; }
                    100% { left: 105%; }
                }
                @keyframes truck-bounce {
                    0% { transform: translateY(0) rotate(0deg); }
                    100% { transform: translateY(-2px) rotate(1deg); }
                }
                @keyframes truck-idle {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-1.5px); }
                }

                nav .nav-controls, html body nav .nav-controls { 
                    display: flex !important; 
                    align-items: center !important; 
                    gap: 15px !important;
                    margin-left: auto !important;
                    position: relative !important;
                    inset: auto !important;
                }
                
                .hamburger, nav .hamburger, html body nav .hamburger {
                    display: none !important;
                    cursor: pointer !important;
                    align-items: center !important;
                    justify-content: center !important;
                    position: relative !important;
                    top: auto !important;
                    left: auto !important;
                    right: auto !important;
                    bottom: auto !important;
                    margin: 0 !important;
                    transform: none !important;
                    z-index: 5 !important;
                }

                .find-my-size-btn, .size-disclaimer, .size-calc-modal-title, .size-calc-result-box {
                    font-family: 'Poppins', sans-serif !important;
                }

                @media (max-width: 768px) {
                    .marquee-track span {
                        font-size: 10px;
                        letter-spacing: 2px;
                        padding-right: 30px;
                    }

                    nav .hamburger, html body nav .hamburger { 
                        display: flex !important; 
                    }
                    nav .theme-toggle-btn, html body nav .theme-toggle-btn { 
                        display: none !important; 
                    }
                    
                    .mobile-theme-toggle { 
                        display: block !important; 
                        margin-top: 10px; 
                        padding-top: 15px; 
                        border-top: 1px solid rgba(128, 128, 128, 0.2); 
                        color: inherit; 
                        font-weight: bold; 
                    }
                    
                    nav ul.nav-menu, html body nav .nav-menu, html body nav ul {
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        position: fixed !important;
                        top: 0 !important;
                        right: 0 !important;
                        width: 280px !important;
                        height: 100vh !important;
                        background-color: #fff !important;
                        margin: 0 !important;
                        padding: 80px 0 0 0 !important;
                        box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1) !important;
                        z-index: 1000000 !important;
                        box-sizing: border-box !important;
                        
                        transform: translateX(100%) !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        transition: transform 0.35s cubic-bezier(0.32, 0.94, 0.6, 1), opacity 0.3s ease, visibility 0.35s !important;
                    }
                    
                    body.dark-mode nav ul.nav-menu, body.dark-mode html body nav .nav-menu { 
                        background-color: #1a1a1a !important; 
                        color: #fff !important; 
                    }
                    
                    nav ul.nav-menu.open, html body nav .nav-menu.open { 
                        transform: translateX(0) !important; 
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    nav ul.nav-menu.closing, html body nav .nav-menu.closing { 
                        transform: translateX(100%) !important; 
                        opacity: 0 !important;
                        transition: transform 0.35s cubic-bezier(0.4, 0, 1, 1), opacity 0.3s ease !important;
                    }

                    nav ul.nav-menu li, html body nav .nav-menu li {
                        width: 100% !important;
                        padding: 18px 25px !important;
                        text-align: left !important;
                        box-sizing: border-box !important;
                        border-bottom: 1px solid rgba(128, 128, 128, 0.1) !important;
                        list-style: none !important;
                        cursor: pointer !important;
                    }
                    nav ul.nav-menu li:hover, html body nav .nav-menu li:hover {
                        background-color: rgba(128, 128, 128, 0.05) !important;
                    }
                    
                    .menu-backdrop { 
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        background-color: rgba(0, 0, 0, 0.25) !important;
                        backdrop-filter: blur(8px) !important;
                        -webkit-backdrop-filter: blur(8px) !important;
                        z-index: 99998 !important;
                    }
                }

                @media (min-width: 769px) { 
                    .mobile-theme-toggle, 
                    nav ul.nav-menu li.mobile-theme-toggle, 
                    html body nav .nav-menu li.mobile-theme-toggle { 
                        display: none !important; 
                    }
                    
                    nav ul.nav-menu, html body nav .nav-menu {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 35px !important;
                        list-style: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: absolute !important;
                        left: 50% !important;
                        top: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                        width: auto !important;
                        height: auto !important;
                        background: transparent !important;
                        box-shadow: none !important;
                    }
                    nav ul.nav-menu li, html body nav .nav-menu li {
                        cursor: pointer !important;
                        width: auto !important;
                        padding: 0 !important;
                        border: none !important;
                        letter-spacing: 0.5px !important;
                        display: inline-block !important;
                        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1) !important;
                    }
                    nav ul.nav-menu li:hover, html body nav .nav-menu li:hover {
                        opacity: 0.55 !important; 
                        transform: translateY(-1px) !important; 
                    }
                }
            `}</style>

            <nav>
                <h1>ALICCI</h1>
                <ul className={`nav-menu ${isMobileMenuOpen ? "open" : ""} ${isMobileMenuClosing ? "closing" : ""}`}>
                    <li onClick={() => handleNavLinkClick("home")}>Ana Sayfa</li>
                    <li onClick={() => handleNavLinkClick("products")}>Ürünler</li>
                    <li onClick={() => handleNavLinkClick("about")}>Hakkımızda</li>
                    <li onClick={() => handleNavLinkClick("contact")}>İletişim</li>
                    <li onClick={() => handleNavLinkClick(null, openTrackingModal)}>Kargo Takip</li>
                    <li className="mobile-cart-button" onClick={() => {
                        if (isCartOpen) closeCart();
                        else setIsCartOpen(true);
                        closeMobileMenu();
                    }}>
                        Sepetim {cartItems.length > 0 && `(${cartItems.length})`}
                    </li>
                    <li className="mobile-theme-toggle" onClick={toggleDarkMode}>
                        {isDarkMode ? "☀️ Açık Temaya Geç" : "🌙 Karanlık Temaya Geç"}
                    </li>
                </ul>

                <div className="nav-controls">
                    <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                        {isDarkMode ? "☀️" : "🌙"}
                    </button>
                    <div className="hamburger" onClick={toggleMobileMenu}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                        {cartItems.length > 0 && (
                            <span className="cart-count mobile-hamburger-cart-count">
                                {cartItems.length}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            <div className="marquee-wrapper">
                <div className="marquee-track">
                    <span>LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI • LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI •</span>
                    <span>LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI • LIMITED DROP • TIMELESS PIECES • %100 PREMIUM COTTON • SHIPPED IN 24H • DISCOVER THE ART OF STREETWEAR • ALICCI •</span>
                </div>
            </div>

            {(isMobileMenuOpen || isMobileMenuClosing) && (
                <div 
                    className="modal-backdrop menu-backdrop" 
                    onClick={closeMobileMenu} 
                    style={{ 
                        animation: isMobileMenuClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }} 
                />
            )}

            {(isCartOpen || isCartClosing) && (
                <div 
                    className="modal-backdrop cart-backdrop" 
                    onClick={closeCart} 
                    style={{ 
                        animation: isCartClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards",
                        zIndex: 100000 
                    }} 
                />
            )}

            <div className={`cart-panel ${isCartOpen ? "open" : ""} ${isCartClosing ? "closing" : ""}`}>
                <h3>Sepetiniz</h3>
                <ul>
                    {cartItems.length === 0 ? (
                        <p>Sepetinizde ürün bulunmamaktadır.</p>
                    ) : (
                        cartItems.map((item, index) => (
                            <li key={`${item.id}-${item.size}-${index}`} className={removingId === `${item.id}-${item.size}` ? 'removing' : ''}>
                                <div className="item-details">
                                    <span>{item.name} ({item.size})</span>
                                    <span className="item-quantity">
                                        Adet: {item.quantity} x {item.price} TL
                                    </span>
                                </div>
                                <button className="remove-item-button" onClick={() => removeFromCart(item)}>
                                    &times;
                                </button>
                            </li>
                        ))
                    )}
                </ul>

                {cartItems.length > 0 && (
                    <div className="coupon-container">
                        <input 
                            type="text" 
                            placeholder="Kupon Kodu" 
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button className="coupon-btn" onClick={handleApplyCoupon}>Uygula</button>
                    </div>
                )}

                {cartItems.length > 0 && (
                    <div className="total">
                        Toplam: {getTotalPrice()} TL 
                        {discount > 0 && <span className="discount-label"> (%{(discount * 100)} İndirim Uygulandı)</span>}
                    </div>
                )}
                <button onClick={handleCheckout}>Sepeti Onayla</button>
                <button className="close-modal close-modal-small" onClick={closeCart}>
                    &times;
                </button>
            </div>

            <main>
                <section id="home" className="hero">
                    <h2>ALICCI'ye Hoş Geldiniz</h2>
                    <p>En zarif ve şık giyim parçalarını keşfedin.</p>
                    <button onClick={() => handleNavLinkClick("products")}>Koleksiyonu Keşfet</button>
                </section>

                <section id="products" className="products">
                    <h3>Ürünlerimiz</h3>
                    <div className="products-grid">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="product-card skeleton-card">
                                    <div className="skeleton-image"></div>
                                    <div className="info">
                                        <div className="skeleton-text"></div>
                                        <div className="skeleton-text short"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    openProductModal={openProductModal}
                                    closeCart={closeCart}
                                />
                            ))
                        )}
                    </div>
                </section>

                <section id="about" className="about reveal">
                    <h3>Hakkımızda</h3>
                    <p>ALICCI, zamansız şıklığı ve modern tasarımları bir araya getiren bir giyim markasıdır.</p>
                    <p>Sürdürülebilir moda ilkelerini benimseyerek, çevreye duyarlı üretim süreçlerini destekliyor ve uzun ömürlü, kaliteli ürünler sunmaya özen gösteriyoruz.</p>
                </section>

                <section id="contact" className="contact reveal">
                    <h3>İletişim</h3>
                    <form ref={form} onSubmit={handleContactFormSubmit}>
                        <input type="text" name="user_name" placeholder="Adınız Soyadınız" required />
                        <input type="email" name="user_email" placeholder="E-posta Adresiniz" required />
                        <textarea name="message" placeholder="Mesajınız" required></textarea>
                        <button type="submit">Gönder</button>
                    </form>
                    <div className="contact-dm-buttons">
                        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="themed-social-button whatsapp-contact">WhatsApp ile İletişime Geç</a>
                        <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer" className="themed-social-button instagram-contact">Instagram ile İletişime Geç</a>
                    </div>
                </section>
            </main>

            <footer>
                <p>&copy; 2026 ALICCI. Tüm Hakları Saklıdır.</p>
                <div className="instagram">
                    <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer">Instagram</a>
                </div>
            </footer>

            {(selectedProduct || isProductClosing) && (
                <div className="modal-backdrop" onClick={closeProductModal} style={{ animation: isProductClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" }}>
                    <div className="modal-content-base product-modal" onClick={(e) => e.stopPropagation()} style={{ animation: isProductClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards" }}>
                        <button className="close-modal close-modal-small" onClick={closeProductModal}>&times;</button>
                        {selectedProduct && (
                            <div className="product-modal-content-wrapper">
                                <div className="product-modal-image-wrapper">
                                    <img 
                                        src={selectedProduct.image ? selectedProduct.image[currentModalImageIndex] : "/logo.png"} 
                                        alt={selectedProduct.name} 
                                        className="product-modal-image zoomable-image" 
                                        style={{ maxHeight: '60vh', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} 
                                        loading="lazy"
                                    />
                                    {selectedProduct.image && selectedProduct.image.length > 1 && (
                                        <div className="modal-image-navigation">
                                            <button className="modal-nav-arrow left" onClick={prevModalImage}>&#x2039;</button>
                                            <button className="modal-nav-arrow right" onClick={nextModalImage}>&#x203A;</button>
                                        </div>
                                    )}
                                </div>
                                <div className="product-info-mobile-order" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <h2>{selectedProduct.name}</h2>
                                    <p className="desc">{selectedProduct.description || "Bu ürün ALICCI koleksiyonunun zarif parçalarındandır."}</p>
                                    
                                    <div className="size-select" style={{ marginBottom: '10px' }}>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '600' }}>Beden Seç:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {(selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes : ["S", "M", "L", "XL", "XXL"]).map((size) => {
                                                const isSizeSoldOut = selectedProduct.sold_out_sizes?.includes(size);
                                                return (
                                                    <button 
                                                        key={size} 
                                                        className={`${selectedSize === size ? "selected" : ""} ${isSizeSoldOut ? "size-sold-out" : ""}`} 
                                                        onClick={() => !isSizeSoldOut && setSelectedSize(size)}
                                                        disabled={isSizeSoldOut || selectedProduct.stock === 0}
                                                    >
                                                        {size} {isSizeSoldOut && "(Tükendi)"}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setShowSizeCalcModal(true);
                                                setCalcResult(null);
                                            }}
                                            className="find-my-size-btn"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: isDarkMode ? '#bbb' : '#333',
                                                cursor: 'pointer',
                                                fontSize: '12.5px',
                                                fontWeight: '600',
                                                textDecoration: 'underline',
                                                padding: 0,
                                                letterSpacing: '0.5px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            📐 Bedenimi Bul
                                        </button>
                                    </div>

                                    <button 
                                        className="add-to-cart-button" 
                                        onClick={handleAddToCart} 
                                        disabled={!selectedSize || selectedProduct.stock === 0 || selectedProduct.sold_out_sizes?.includes(selectedSize)}
                                        style={{ marginBottom: '20px' }}
                                    >
                                        {selectedProduct.stock === 0 
                                            ? "TÜKENDİ" 
                                            : selectedSize && selectedProduct.sold_out_sizes?.includes(selectedSize)
                                                ? "Seçilen Beden Tükendi"
                                                : "Sepete Ekle"
                                        }
                                    </button>

                                    <div 
                                        className="size-disclaimer" 
                                        style={{ 
                                            marginTop: 'auto', 
                                            padding: '10px 0', 
                                            borderTop: isDarkMode ? '1px solid #2d2d2d' : '1px solid #f0f0f0',
                                            fontSize: '11px', 
                                            lineHeight: '1.4',
                                            opacity: 0.6,
                                            textAlign: 'left'
                                        }}
                                    >
                                        * Kalıplar kumaş esnekliğine ve kesim tarzına bağlı olarak değişiklik gösterebilir. Ölçümler el yapımı olduğu için küçük sapmalar yaşanabilir. Tarzınıza en uygun bedeni seçtiğinizden emin olun.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {(showSizeCalcModal || isSizeCalcClosing) && (
                <div 
                    className="modal-backdrop" 
                    onClick={closeSizeCalcModal}
                    style={{ 
                        zIndex: 1000005, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        animation: isSizeCalcClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                >
                    <div 
                        className="modal-content-base size-calc-modal" 
                        onClick={(e) => e.stopPropagation()} 
                        onMouseMove={handleModalMouseMove}
                        onMouseLeave={handleModalMouseLeave}
                        style={{ 
                            maxWidth: '360px', 
                            padding: '25px', 
                            borderRadius: '8px',
                            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                            color: isDarkMode ? '#ffffff' : '#000000',
                            boxShadow: isDarkMode ? '0 20px 50px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.15)',
                            border: isDarkMode ? '1px solid #333' : '1px solid #eee',
                            animation: isSizeCalcClosing ? "slide-down 0.3s cubic-bezier(0.32, 0.94, 0.6, 1) forwards" : "slide-up 0.3s cubic-bezier(0.32, 0.94, 0.6, 1) forwards",
                            transformStyle: "preserve-3d",
                            willChange: "transform",
                            ...modalTiltStyle
                        }}
                    >
                        <button 
                            className="close-modal close-modal-small" 
                            onClick={closeSizeCalcModal}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                        >
                            &times;
                        </button>
                        
                        <h3 className="size-calc-modal-title" style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '800', color: isDarkMode ? '#fff' : '#000', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            ALICCI Beden Sihirbazı
                        </h3>
                        <p style={{ fontSize: '11px', opacity: 0.6, margin: '0 0 20px 0' }}>En doğru streetwear kalıbını bulmak için bilgileri girin.</p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px', fontWeight: '500' }}>
                                <span>Boy</span>
                                <span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold' }}>{calcHeight} cm</span>
                            </div>
                            <input 
                                type="range" min="150" max="210" value={calcHeight} 
                                onChange={(e) => setCalcHeight(Number(e.target.value))}
                                style={{ width: '100%', accentColor: isDarkMode ? '#fff' : '#000', cursor: 'pointer' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px', fontWeight: '500' }}>
                                <span>Kilo</span>
                                <span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold' }}>{calcWeight} kg</span>
                            </div>
                            <input 
                                type="range" min="40" max="120" value={calcWeight} 
                                onChange={(e) => setCalcWeight(Number(e.target.value))}
                                style={{ width: '100%', accentColor: isDarkMode ? '#fff' : '#000', cursor: 'pointer' }}
                            />
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'flex-end', 
                            height: '105px', 
                            marginBottom: '20px',
                            background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                            borderBottom: isDarkMode ? '1px dashed #333' : '1px dashed #ddd',
                            paddingBottom: '4px',
                            overflow: 'hidden',
                            borderRadius: '4px'
                        }}>
                            <div style={{
                                transform: `scaleX(${0.65 + ((calcWeight - 40) / 80) * 0.7}) scaleY(${0.72 + ((calcHeight - 150) / 60) * 0.55})`,
                                transformOrigin: 'bottom center',
                                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                                color: isDarkMode ? '#ffffff' : '#000000',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <div className="avatar-breathing-layer">
                                    <svg width="36" height="75" viewBox="0 0 36 75" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle className="avatar-head" cx="18" cy="11" r="6.5" fill="currentColor" />
                                        <rect x="10" y="21" width="16" height="30" rx="5" fill="currentColor" />
                                        <rect x="12" y="53" width="4.5" height="20" rx="1.5" fill="currentColor" />
                                        <rect x="19.5" y="53" width="4.5" height="20" rx="1.5" fill="currentColor" />
                                        <rect className="avatar-arm-left" x="4.5" y="22.5" width="4" height="22" rx="1.5" fill="currentColor" />
                                        <rect className="avatar-arm-right" x="27.5" y="22.5" width="4" height="22" rx="1.5" fill="currentColor" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Giyim Tarzı</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setCalcFit('regular')}
                                    style={{
                                        padding: '10px', fontSize: '11px', fontWeight: '600', border: '1px solid', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                                        borderColor: calcFit === 'regular' ? (isDarkMode ? '#fff' : '#000') : (isDarkMode ? '#444' : '#ccc'),
                                        backgroundColor: calcFit === 'regular' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                                        color: 'inherit'
                                    }}
                                >
                                    Tam Otursun (Regular)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setCalcFit('oversize')}
                                    style={{
                                        padding: '10px', fontSize: '11px', fontWeight: '600', border: '1px solid', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                                        borderColor: calcFit === 'oversize' ? (isDarkMode ? '#fff' : '#000') : (isDarkMode ? '#444' : '#ccc'),
                                        backgroundColor: calcFit === 'oversize' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                                        color: 'inherit'
                                    }}
                                >
                                    Sokak Tarzı (Oversize)
                                </button>
                            </div>
                        </div>

                        <button 
                            type="button"
                            onClick={() => {
                                const recommended = getRecommendedSize(calcHeight, calcWeight, calcFit);
                                setCalcResult(recommended);
                            }}
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                backgroundColor: isDarkMode ? '#ffffff' : '#000000', 
                                color: isDarkMode ? '#000000' : '#ffffff', 
                                border: 'none', 
                                borderRadius: '4px', 
                                fontWeight: 'bold', 
                                fontSize: '12px', 
                                cursor: 'pointer', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px' 
                            }}
                        >
                            Önerilen Bedeni Gör
                        </button>

                        {calcResult && (
                            <div 
                                className="size-calc-result-box"
                                style={{ 
                                    marginTop: '20px', 
                                    padding: '15px', 
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', 
                                    border: isDarkMode ? '1px dashed #555' : '1px dashed #bbb', 
                                    borderRadius: '4px', 
                                    textAlign: 'center',
                                    animation: 'fade-in 0.3s ease'
                                }}
                            >
                                <p style={{ fontSize: '11px', margin: 0, opacity: 0.7 }}>Sizin için ideal ALICCI kalıbı:</p>
                                <p style={{ fontSize: '24px', fontWeight: '900', color: isDarkMode ? '#fff' : '#000', margin: '5px 0 12px 0', letterSpacing: '1px' }}>{calcResult}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const isSizeSoldOut = selectedProduct?.sold_out_sizes?.includes(calcResult);
                                        if (isSizeSoldOut) {
                                            showToast(`Önerilen beden (${calcResult}) maalesef tükendi.`);
                                        } else {
                                            setSelectedSize(calcResult);
                                            showToast(`Beden olarak ${calcResult} seçildi!`);
                                            closeSizeCalcModal();
                                        }
                                    }}
                                    style={{ 
                                        background: isDarkMode ? '#fff' : '#000', 
                                        color: isDarkMode ? '#000' : '#fff', 
                                        border: 'none', 
                                        padding: '8px 16px', 
                                        borderRadius: '4px', 
                                        fontSize: '11px', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Bu Bedeni Uygula
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showOrderOptionsModal && (
                <div className="modal-backdrop" onClick={closeOrderOptionsModal}>
                    <div className="modal-content-base order-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeOrderOptionsModal}>&times;</button>
                        <h2>Siparişinizi Tamamlayın</h2>
                        <p>Siparişiniz için ödeme yapmak üzere bizimle iletişime geçebilirsiniz:</p>
                        <div className="contact-dm-buttons">
                            <button className="themed-social-button whatsapp-contact" onClick={() => handleCreateOrder("whatsapp")}>
                                WhatsApp ile Sipariş Ver
                            </button>
                            <button className="themed-social-button instagram-contact" onClick={() => handleCreateOrder("instagram")}>
                                Instagram DM ile Sipariş Ver
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTrackingModal && (
                <div className="modal-backdrop" style={{ animation: isTrackingClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards" }} onClick={closeTrackingModal}>
                    <div className="modal-content-base tracking-modal-content" style={{ animation: isTrackingClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards" }} onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeTrackingModal}>&times;</button>
                        <h2>Kargo Takip Paneli</h2>
                        <p style={{ fontSize: '13px', marginBottom: '15px', opacity: 0.8 }}>Sipariş verirken size verilen ALC ile başlayan sipariş kodunu giriniz.</p>
                        
                        <div className="tracking-search-box">
                            <input 
                                type="text" 
                                placeholder="Örn: ALC-123456" 
                                value={trackingCodeInput}
                                onChange={(e) => setTrackingCodeInput(e.target.value)}
                            />
                            <button onClick={handleTrackOrder} disabled={isTrackingLoading}>
                                {isTrackingLoading ? (
                                    <><span className="spinner"></span> Sorgulanıyor...</>
                                ) : (
                                    "Sorgula"
                                )}
                            </button>
                        </div>

                        {trackingError && <p style={{ color: 'red', fontSize: '13px' }}>{trackingError}</p>}

                        {searchedOrder && (
                            <div className="tracking-result tracking-result-wrapper" style={{ background: 'rgba(128,128,128,0.1)', padding: '15px', borderRadius: '4px', textAlign: 'left', marginTop: '15px' }}>
                                <p><strong>Sipariş Kodu:</strong> {searchedOrder.order_code}</p>
                                <p><strong>Durum:</strong> 
                                    <span style={{ 
                                        color: searchedOrder.status === 'Kargoda' || searchedOrder.status === 'Teslim Edildi' ? '#34c759' : 
                                               searchedOrder.status === 'İptal Edildi' ? '#ff3b30' : '#ff9500', 
                                        fontWeight: 'bold',
                                        marginLeft: '5px'
                                    }}>
                                        {searchedOrder.status}
                                    </span>
                                </p>
                                <p><strong>Kargo Firması:</strong> {searchedOrder.cargo_company || '-'}</p>
                                <p><strong>Kargo Takip No:</strong> {searchedOrder.cargo_tracker_code || '-'}</p>
                                <p><strong>Toplam Tutar:</strong> {searchedOrder.total_price} TL</p>

                                {searchedOrder.status === "Kargoda" ? (
                                    <div className="animated-truck-road">
                                        <div className="animated-truck">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? "#fff" : "#000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="3" width="15" height="13"></rect>
                                                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                                                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                            </svg>
                                        </div>
                                    </div>
                                ) : searchedOrder.status === "Onay Bekleniyor" ? (
                                    <div className="animated-truck-road">
                                        <div className="animated-truck waiting">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="3" width="15" height="13"></rect>
                                                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                                                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                            </svg>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <div className="contact-dm-buttons tracking-dm-buttons" style={{ marginTop: '20px', borderTop: '1px solid rgba(128,128,128,0.2)', paddingTop: '15px' }}>
                            <p style={{ fontSize: '12px', marginBottom: '10px' }}>Sorun mu yaşıyorsunuz? Doğrudan destek alın:</p>
                            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="themed-social-button whatsapp-contact">WhatsApp Destek</a>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmationModal && (
                <div className="modal-backdrop" onClick={closeConfirmationModal}>
                    <div className="modal-content-base order-confirmation" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeConfirmationModal}>&times;</button>
                        <h2>Yönlendiriliyorsunuz...</h2>
                        <p>Siparişinizi tamamlamak için lütfen açılan uygulamada mesajı <strong>göndermeyi unutmayın.</strong></p>
                        <button onClick={closeConfirmationModal}>Anladım</button>
                    </div>
                </div>
            )}

            {(showIyzicoModal || isIyzicoClosing) && (
                <div 
                    className="fixed inset-0 z-[1000010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                    style={{ 
                        animation: isIyzicoClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                    onClick={closeIyzicoModal}
                >
                    <div 
                        className="relative w-full max-w-[550px] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-lg p-6 shadow-2xl border border-gray-100 dark:border-[#333] transition-all duration-300"
                        style={{ 
                            animation: isIyzicoClosing ? "slide-down 0.3s cubic-bezier(0.32, 0.94, 0.6, 1) forwards" : "slide-up 0.3s cubic-bezier(0.32, 0.94, 0.6, 1) forwards"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="absolute top-4 right-4 text-2xl font-bold cursor-pointer hover:opacity-70 dark:text-white text-black bg-transparent border-none outline-none"
                            onClick={closeIyzicoModal}
                        >
                            &times;
                        </button>
                        
                        <h3 className="text-lg font-extrabold uppercase tracking-wider mb-1 dark:text-white text-black font-sans">
                            ALICCI GÜVENLİ ÖDEME
                        </h3>
                        <p className="text-xs opacity-60 mb-6 dark:text-gray-400 text-gray-600 font-sans">
                            256-bit SSL korumalı Iyzico altyapısıyla ödemenizi güvenle tamamlayın.
                        </p>

                        {isIyzicoLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-semibold opacity-75 font-sans">Ödeme formu hazırlanıyor, lütfen bekleyin...</p>
                            </div>
                        ) : (
                            <div 
                                id="iyzipay-checkout-form" 
                                className="responsive w-full min-h-[300px]"
                                dangerouslySetInnerHTML={{ __html: iyzicoFormHtml }}
                            />
                        )}
                    </div>
                </div>
            )}
            
            {toast && (
                <div className="toast-container">
                    <div className="toast-message">{toast}</div>
                </div>
            )}

            {/* Chatbot Bileşeni */}
            <Chatbot />

            <Analytics />
        </>
    );
}

export default App;
