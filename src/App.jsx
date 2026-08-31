import React, { useState, useRef, useEffect } from "react";
import emailjs from "emailjs-com";
import "./index.css";
import { Analytics } from "@vercel/analytics/react"; 
import { supabase } from "./supabaseclient";

// ==========================================
// BACKEND SUNUCU ADRESİ
// ==========================================
const BACKEND_URL = "https://alicci-backend-us.onrender.com"; 

// Hızlı Kısayol Butonları
const quickActions = [
  { key: 'tracking', label: '📦 Kargo Takibi' },
  { key: 'size', label: '📏 Beden Rehberi' },
  { key: 'returns', label: '🔄 İade & Değişim' }
];

// ==========================================
// AKILLI ALICCI DESTEK CHATBOT BİLEŞENİ
// ==========================================
function Chatbot({ isOpen, setIsOpen }) {
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
    <div className="chatbot-container">
      
      {/* 1. Chat Penceresi */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        
        {/* Header */}
        <div className="chatbot-header">
          <div>
            <h3 className="chatbot-title">ALICCI AI ASSISTANT</h3>
            <p className="chatbot-status">
              <span className="chatbot-status-dot"></span>
              Çevrimiçi • AI Destekli
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="chatbot-close-btn"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Mesaj Alanı */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chatbot-message-wrapper ${msg.sender}`}
            >
              <div className={`chatbot-message-bubble ${msg.sender}`}>
                {msg.text.split('**').map((part, idx) => 
                  idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chatbot-message-wrapper bot">
              <div className="chatbot-typing-indicator">
                Yazıyor...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hızlı Kısayollar */}
        <div className="chatbot-quick-actions">
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleSend(action.label)}
              className="chatbot-quick-btn"
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
          className="chatbot-input-form"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir soru sorun..."
            className="chatbot-input"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="chatbot-send-btn"
          >
            Gönder
          </button>
        </form>

      </div>

      {/* 2. Açma/Kapama Balon Butonu */}
      <button
        onClick={() => setIsOpen()}
        className={`chatbot-toggle-btn ${isOpen ? 'open' : ''}`}
        aria-label="Sohbeti Aç/Kapat"
      >
        {isOpen ? (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

    </div>
  );
}

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

// ==========================================
// YENİLENMİŞ YUMUŞAK GEÇİŞLİ & YUKARI KALKAN PRODUCT CARD
// ==========================================
const ProductCard = ({ product, openProductModal, closeCart }) => {
    const handleClick = () => {
        if (closeCart) closeCart();
        openProductModal(product);
    };

    const isCompletelySoldOut = product.stock === 0;
    const primaryImg = product.image && product.image[0] ? product.image[0] : "/logo.png";
    const secondaryImg = product.image && product.image[1] ? product.image[1] : primaryImg;

    return (
        <div
            className={`product-card reveal ${isCompletelySoldOut ? "sold-out" : ""}`}
            onClick={handleClick}
        >
            {isCompletelySoldOut && <div className="sold-out-badge">TÜKENDİ</div>}
            
            <div className="product-image-wrapper">
                <img
                    src={primaryImg}
                    alt={product.name}
                    className="product-card-image primary"
                    loading="lazy"
                />
                <img
                    src={secondaryImg}
                    alt={`${product.name} Hover`}
                    className="product-card-image secondary"
                    loading="lazy"
                />
            </div>

            <div className="info">
                <h4>{product.name}</h4>
                <p>{product.price} TL</p>
            </div>
        </div>
    );
};

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

    // Scroll-driven hero state
    const heroRef = useRef(null);
    const [heroActiveSlide, setHeroActiveSlide] = useState(0);
    
    // AI Chatbot State'i
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);

    // Yasal Sayfalar Modal State'i
    const [activeLegalModal, setActiveLegalModal] = useState(null); // 'terms', 'privacy', 'returns', 'contact'
    const [isLegalClosing, setIsLegalClosing] = useState(false);

    const [showSizeCalcModal, setShowSizeCalcModal] = useState(false);
    const [isSizeCalcClosing, setIsSizeCalcClosing] = useState(false);
    const [modalTiltStyle, setModalTiltStyle] = useState({});
    
    const [calcHeight, setCalcHeight] = useState(170);
    const [calcWeight, setCalcWeight] = useState(65);
    const [calcFit, setCalcFit] = useState("oversize");
    
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
    const STORE_EMAIL = "alicci.tr@gmail.com";
    const STORE_PHONE = "+90 551 190 31 18";
    const STORE_ADDRESS = "Agahefendi Mah. 2054 sk. Sorgun / Yozgat, Türkiye";

    // AI Chatbot Açma/Kapama ve Diğer Modalları Temizleme Yönetimi
    const toggleChatbot = (explicitState) => {
        const nextState = typeof explicitState === 'boolean' ? explicitState : !isChatbotOpen;
        if (nextState) {
            setSelectedProduct(null);
            setIsCartOpen(false);
            setShowTrackingModal(false);
            setShowSizeCalcModal(false);
            setShowOrderOptionsModal(false);
            setIsMobileMenuOpen(false);
            setShowIyzicoModal(false);
            setActiveLegalModal(null);
        }
        setIsChatbotOpen(nextState);
    };

    const openLegalModal = (type) => {
        setIsChatbotOpen(false);
        setActiveLegalModal(type);
        setIsLegalClosing(false);
    };

    const closeLegalModal = () => {
        setIsLegalClosing(true);
        setTimeout(() => {
            setActiveLegalModal(null);
            setIsLegalClosing(false);
        }, 300);
    };

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
                    console.warn("Backend uyandırılırken bir sorun oluştu (uykuda olabilir, uyanıyor):", err);
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
        const handleHeroScroll = () => {
            const section = heroRef.current;
            if (!section) return;

            const rect = section.getBoundingClientRect();
            const viewportHeight = window.innerHeight || 1;
            const scrollDistance = Math.max(1, section.offsetHeight - viewportHeight);
            const progress = Math.min(1, Math.max(0, -rect.top / scrollDistance));
            const nextSlide = Math.min(2, Math.floor(progress * 3 + 0.05));

            setHeroActiveSlide((current) => current === nextSlide ? current : nextSlide);
        };

        window.addEventListener("scroll", handleHeroScroll, { passive: true });
        window.addEventListener("resize", handleHeroScroll);
        handleHeroScroll();

        return () => {
            window.removeEventListener("scroll", handleHeroScroll);
            window.removeEventListener("resize", handleHeroScroll);
        };
    }, [products.length]);

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

    // SCROLL ENGELLEME (no-scroll) EFEKTİ
    useEffect(() => {
        const isAnyModalOpen = selectedProduct || showOrderOptionsModal || showConfirmationModal || showTrackingModal || isCartOpen || isMobileMenuOpen || showSizeCalcModal || isSizeCalcClosing || showIyzicoModal || isIyzicoClosing || activeLegalModal;
        if (isAnyModalOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [selectedProduct, showOrderOptionsModal, showConfirmationModal, showTrackingModal, isCartOpen, isMobileMenuOpen, showSizeCalcModal, isSizeCalcClosing, showIyzicoModal, isIyzicoClosing, activeLegalModal]);

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
        setIsChatbotOpen(false);
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
        if (e) e.stopPropagation();
        if (selectedProduct && selectedProduct.image) {
            setCurrentModalImageIndex((prevIndex) =>
                (prevIndex + 1) % selectedProduct.image.length
            );
        }
    };

    const prevModalImage = (e) => {
        if (e) e.stopPropagation();
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
            setIsChatbotOpen(false);
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
        setIsChatbotOpen(false);
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

                /* LÜKS YUMUŞAK GEÇİŞ VE GLASSMORPHISM ANIMASYONLARI */
                @keyframes fadeIn {
                    from {
                        opacity: 0.35;
                        transform: scale(0.985);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .product-modal-image-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    overflow: hidden;
                    border-radius: 12px;
                    background: rgba(0, 0, 0, 0.02);
                }
                body.dark-mode .product-modal-image-wrapper {
                    background: rgba(255, 255, 255, 0.02);
                }

                /* GLASSMORPHISM GEZİNME BUTONLARI */
                .modal-nav-glass-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    color: #111;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 10;
                }

                .product-modal-image-wrapper:hover .modal-nav-glass-btn {
                    opacity: 1;
                }

                .modal-nav-glass-btn.left {
                    left: 12px;
                }

                .modal-nav-glass-btn.right {
                    right: 12px;
                }

                .modal-nav-glass-btn:hover {
                    background: rgba(255, 255, 255, 0.85);
                    transform: translateY(-50%) scale(1.08);
                }

                .modal-nav-glass-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }

                body.dark-mode .modal-nav-glass-btn {
                    background: rgba(0, 0, 0, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                }

                body.dark-mode .modal-nav-glass-btn:hover {
                    background: rgba(0, 0, 0, 0.8);
                }

                /* GEZİNME NOKTALARI (DOTS) */
                .modal-image-dots {
                    position: absolute;
                    bottom: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    z-index: 10;
                    padding: 4px 8px;
                    background: rgba(0, 0, 0, 0.25);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border-radius: 20px;
                }

                .modal-dot {
                    height: 6px;
                    width: 6px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .modal-dot.active {
                    width: 18px;
                    border-radius: 10px;
                    background: #ffffff;
                }

                /* PRODUCT CARD YUKARI KALKMA VE FADE-IN STİLLERİ */
                .product-card {
                    cursor: pointer;
                    position: relative;
                }
                .product-card.reveal {
                    opacity: 0;
                    transform: translateY(40px) scale(0.98);
                    transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), 
                                transform 0.85s cubic-bezier(0.16, 1, 0.3, 1),
                                box-shadow 0.3s ease;
                }
                .product-card.reveal.active {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                .product-card.reveal.active:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
                }
                body.dark-mode .product-card.reveal.active:hover {
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
                }

                .product-image-wrapper {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                    border-radius: 4px;
                }
                .product-card-image {
                    width: 100%;
                    display: block;
                    transition: opacity 0.4s ease;
                }
                .product-card-image.secondary {
                    position: absolute;
                    top: 0;
                    left: 0;
                    opacity: 0;
                }
                .product-card:hover .product-card-image.secondary {
                    opacity: 1;
                }
                .product-card:hover .product-card-image.primary {
                    opacity: 0;
                }

                /* YENİ GELİŞMİŞ FOOTER STİLLERİ */
                .site-footer {
                    background-color: #0d0d0d;
                    color: #fff;
                    padding: 60px 20px 25px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    font-family: 'Poppins', sans-serif;
                    margin-top: 60px;
                }
                body.dark-mode .site-footer {
                    background-color: #050505;
                    border-top-color: rgba(255, 255, 255, 0.05);
                }
                .footer-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 40px;
                }
                .footer-column h4 {
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                    color: #ffffff;
                    position: relative;
                }
                .footer-column h4::after {
                    content: '';
                    display: block;
                    width: 24px;
                    height: 2px;
                    background: #ffffff;
                    margin-top: 6px;
                }
                .footer-column p {
                    font-size: 12.5px;
                    color: #aaa;
                    line-height: 1.7;
                    margin: 0 0 10px 0;
                }
                .footer-column ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .footer-column ul li {
                    margin-bottom: 12px;
                }
                .footer-column ul li button, .footer-column ul li a {
                    background: none;
                    border: none;
                    color: #aaa;
                    font-size: 13px;
                    cursor: pointer;
                    padding: 0;
                    text-align: left;
                    transition: color 0.2s ease, transform 0.2s ease;
                    text-decoration: none;
                    display: inline-block;
                }
                .footer-column ul li button:hover, .footer-column ul li a:hover {
                    color: #fff;
                    transform: translateX(4px);
                }
                .footer-bottom {
                    max-width: 1200px;
                    margin: 40px auto 0;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    color: #777;
                }
                .legal-modal-body {
                    line-height: 1.7;
                    font-size: 13px;
                    color: inherit;
                    text-align: left;
                    max-height: 65vh;
                    overflow-y: auto;
                    padding-right: 10px;
                }
                .legal-modal-body h3 {
                    font-size: 15px;
                    margin-top: 18px;
                    margin-bottom: 8px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }

                /* CHATBOT STİLLERİ */
                .chatbot-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9999999;
                    font-family: sans-serif;
                }
                .chatbot-window {
                    position: absolute;
                    bottom: 70px;
                    right: 0;
                    width: 340px;
                    height: 480px;
                    background-color: #fff;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                    border: 1px solid #e5e5e5;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                    pointer-events: none;
                    transform-origin: bottom right;
                    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                body.dark-mode .chatbot-window {
                    background-color: #1a1a1a;
                    border-color: #333;
                    color: #fff;
                }
                .chatbot-window.open {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: all;
                }
                .chatbot-header {
                    background-color: #000;
                    color: #fff;
                    padding: 14px 18px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                body.dark-mode .chatbot-header {
                    background-color: #111;
                    border-bottom: 1px solid #222;
                }
                .chatbot-title {
                    margin: 0;
                    font-size: 12px;
                    font-weight: bold;
                    letter-spacing: 1px;
                    color: #fff;
                }
                .chatbot-status {
                    margin: 3px 0 0 0;
                    font-size: 10px;
                    color: #34d399;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .chatbot-status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #34d399;
                    display: inline-block;
                }
                .chatbot-close-btn {
                    background: none;
                    border: none;
                    color: #aaa;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px;
                }
                .chatbot-close-btn:hover {
                    color: #fff;
                }
                .chatbot-messages {
                    flex: 1;
                    padding: 14px;
                    overflow-y: auto;
                    background-color: #f9f9f9;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-size: 12px;
                }
                body.dark-mode .chatbot-messages {
                    background-color: #121212;
                }
                .chatbot-message-wrapper {
                    display: flex;
                }
                .chatbot-message-wrapper.user {
                    justify-content: flex-end;
                }
                .chatbot-message-wrapper.bot {
                    justify-content: flex-start;
                }
                .chatbot-message-bubble {
                    max-width: 82%;
                    padding: 10px 14px;
                    border-radius: 14px;
                    line-height: 1.4;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.03);
                }
                .chatbot-message-bubble.user {
                    background-color: #000;
                    color: #fff;
                    border: none;
                }
                body.dark-mode .chatbot-message-bubble.user {
                    background-color: #fff;
                    color: #000;
                }
                .chatbot-message-bubble.bot {
                    background-color: #fff;
                    color: #111;
                    border: 1px solid #eee;
                }
                body.dark-mode .chatbot-message-bubble.bot {
                    background-color: #222;
                    color: #eee;
                    border-color: #333;
                }
                .chatbot-typing-indicator {
                    background-color: #fff;
                    border: 1px solid #eee;
                    padding: 8px 12px;
                    border-radius: 12px;
                    color: #888;
                }
                body.dark-mode .chatbot-typing-indicator {
                    background-color: #222;
                    border-color: #333;
                    color: #aaa;
                }
                .chatbot-quick-actions {
                    padding: 8px;
                    background-color: #fff;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 6px;
                    overflow-x: auto;
                }
                body.dark-mode .chatbot-quick-actions {
                    background-color: #1a1a1a;
                    border-color: #2d2d2d;
                }
                .chatbot-quick-btn {
                    font-size: 11px;
                    background-color: #f0f0f0;
                    color: #333;
                    padding: 6px 12px;
                    border-radius: 20px;
                    border: none;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background-color 0.2s;
                }
                body.dark-mode .chatbot-quick-btn {
                    background-color: #2a2a2a;
                    color: #ddd;
                }
                .chatbot-quick-btn:hover {
                    background-color: #e0e0e0;
                }
                body.dark-mode .chatbot-quick-btn:hover {
                    background-color: #3a3a3a;
                }
                .chatbot-input-form {
                    padding: 10px;
                    background-color: #fff;
                    border-top: 1px solid #eee;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                body.dark-mode .chatbot-input-form {
                    background-color: #1a1a1a;
                    border-color: #2d2d2d;
                }
                .chatbot-input {
                    flex: 1;
                    padding: 8px 12px;
                    background-color: #f4f4f4;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    font-size: 12px;
                    outline: none;
                    color: #000;
                }
                body.dark-mode .chatbot-input {
                    background-color: #252525;
                    border-color: #3d3d3d;
                    color: #fff;
                }
                .chatbot-send-btn {
                    background-color: #000;
                    color: #fff;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: opacity 0.2s;
                }
                body.dark-mode .chatbot-send-btn {
                    background-color: #fff;
                    color: #000;
                }
                .chatbot-send-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .chatbot-toggle-btn {
                    background-color: #000;
                    color: #fff;
                    border-radius: 50%;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                    border: 1px solid #333;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 56px;
                    height: 56px;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s;
                    float: right;
                }
                body.dark-mode .chatbot-toggle-btn {
                    background-color: #fff;
                    color: #000;
                    border-color: #fff;
                }
                .chatbot-toggle-btn.open {
                    transform: rotate(90deg);
                }
                .chatbot-toggle-btn svg {
                    width: 24px;
                    height: 24px;
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

                .secondary-checkout-btn {
                    margin-top: 10px !important;
                    background-color: transparent !important;
                    color: inherit !important;
                    border: 1px solid rgba(128, 128, 128, 0.4) !important;
                }
                .secondary-checkout-btn:hover {
                    background-color: rgba(128, 128, 128, 0.1) !important;
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
                        setIsChatbotOpen(false);
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
                {cartItems.length > 0 && (
                    <>
                        <button className="secondary-checkout-btn" onClick={() => {
                            closeCart();
                            setShowOrderOptionsModal(true);
                        }}>WhatsApp / DM ile Sipariş Ver</button>
                    </>
                )}
                <button className="close-modal close-modal-small" onClick={closeCart}>
                    &times;
                </button>
            </div>

            <main>
                <section
                    id="home"
                    ref={heroRef}
                    className="hero-scroll-section"
                    aria-label="ALICCI giriş bölümü"
                >
                    {(() => {
                        const heroImages = [];
                        products.forEach((product) => {
                            (product.image || []).forEach((image) => {
                                if (image && !heroImages.includes(image)) heroImages.push(image);
                            });
                        });

                        const firstImage = heroImages[0] || null;
                        const secondImage = heroImages[1] || firstImage;
                        const thirdImage = heroImages[2] || firstImage;

                        const slides = [
                            {
                                eyebrow: "ALICCI",
                                title: "Sessiz Lüks.",
                                text: "Gösterişten uzak. Detaylarda güçlü. Zamansız.",
                                video: "https://uunncptklxipioiwgbav.supabase.co/storage/v1/object/public/urunler/yaka-etiketi-luks-mark.mp4",
                                image: firstImage,
                                action: "Koleksiyonu Keşfet",
                            },
                            {
                                eyebrow: "THE COLLECTION",
                                title: "Sadelik bir tavırdır.",
                                text: "Temiz çizgiler, premium dokular ve modern bir siluet.",
                                image: secondImage,
                                action: "Ürünleri Gör",
                            },
                            {
                                eyebrow: "ALICCI / ESSENTIALS",
                                title: "Bugün değil, yıllarca.",
                                text: "Koleksiyonu keşfet ve kendi stilini oluştur.",
                                image: thirdImage,
                                action: "Koleksiyona Git",
                            },
                        ];

                        return (
                            <div className="hero-scroll-sticky">
                                <div className="hero-scroll-media">
                                    {slides.map((slide, index) => (
                                        <div
                                            key={`${slide.eyebrow}-${index}`}
                                            className={`hero-scroll-slide ${index === heroActiveSlide ? "is-active" : ""} ${!slide.image && !slide.video ? "no-image" : ""}`}
                                            aria-hidden={index !== heroActiveSlide}
                                        >
                                            {slide.video ? (
                                                <video
                                                    className="hero-scroll-image"
                                                    src={slide.video}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                    preload="auto"
                                                />
                                            ) : slide.image ? (
                                                <img
                                                    src={slide.image}
                                                    alt={index === 0 ? "ALICCI ürün görseli" : `${slide.eyebrow} görseli`}
                                                    className="hero-scroll-image"
                                                    loading={index === 0 ? "eager" : "lazy"}
                                                />
                                            ) : null}
                                            <div className="hero-scroll-overlay"></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="hero-scroll-content">
                                    {slides.map((slide, index) => (
                                        <div
                                            key={`content-${index}`}
                                            className={`hero-scroll-copy ${index === heroActiveSlide ? "is-active" : ""}`}
                                        >
                                            <span className="hero-scroll-eyebrow">{slide.eyebrow}</span>
                                            <h2>{slide.title}</h2>
                                            <p>{slide.text}</p>
                                            <button onClick={() => handleNavLinkClick("products")}>
                                                {slide.action}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="hero-scroll-bottom">
                                    <span>SCROLL TO EXPLORE</span>
                                    <span className="hero-scroll-line"></span>
                                </div>

                                <div className="hero-scroll-progress" aria-hidden="true">
                                    {[0, 1, 2].map((index) => (
                                        <span key={index} className={index === heroActiveSlide ? "active" : ""}></span>
                                    ))}
                                </div>

                                <div className="hero-scroll-index">
                                    0{heroActiveSlide + 1} <span>/ 03</span>
                                </div>
                            </div>
                        );
                    })()}
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

            {/* ==========================================
                GÜNCELLENMİŞ AKTİF MÜŞTERİ YASAL FOOTER
               ========================================== */}
            <footer className="site-footer">
                <div className="footer-container">
                    
                    {/* Kolon 1: Marka & Açıklama */}
                    <div className="footer-column">
                        <h4>ALICCI</h4>
                        <p>Zamansız sokak modası ve lüks giyim anlayışını premium %100 pamuklu kumaşlarla birleştiriyoruz.</p>
                        <p style={{ marginTop: '15px', opacity: 0.7 }}>📍 Agahefendi Mah. 2504sk. Sorgun / Yozgat</p>
                    </div>

                    {/* Kolon 2: Müşteri Hizmetleri & Kısayollar */}
                    <div className="footer-column">
                        <h4>Müşteri Hizmetleri</h4>
                        <ul>
                            <li><button onClick={() => handleNavLinkClick("products")}>Ürün Koleksiyonu</button></li>
                            <li><button onClick={openTrackingModal}>Kargo Takibi & Sorgulama</button></li>
                            <li><button onClick={() => openLegalModal('returns')}>İade & Değişim Koşulları</button></li>
                            <li><button onClick={() => openLegalModal('contact')}>İletişim & Açık Adres</button></li>
                        </ul>
                    </div>

                    {/* Kolon 3: Yasal Sözleşmeler & Politikalar */}
                    <div className="footer-column">
                        <h4>Yasal Sayfalar</h4>
                        <ul>
                            <li><button onClick={() => openLegalModal('terms')}>Mesafeli Satış Sözleşmesi</button></li>
                            <li><button onClick={() => openLegalModal('privacy')}>Gizlilik ve Çerez Politikası</button></li>
                            <li><button onClick={() => openLegalModal('returns')}>İptal ve İade Sözleşmesi</button></li>
                        </ul>
                    </div>

                    {/* Kolon 4: İletişim Kanalları */}
                    <div className="footer-column">
                        <h4>Bize Ulaşın</h4>
                        <p><strong>Telefon:</strong> <a href={`tel:${WHATSAPP_NUMBER}`} style={{ color: '#aaa', textDecoration: 'none' }}>{STORE_PHONE}</a></p>
                        <p><strong>E-posta:</strong> <a href={`mailto:${STORE_EMAIL}`} style={{ color: '#aaa', textDecoration: 'none' }}>{STORE_EMAIL}</a></p>
                        <p><strong>Sosyal:</strong> <a href={`https://www.instagram.com/${INSTAGRAM_USERNAME}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>@{INSTAGRAM_USERNAME}</a></p>
                        <p style={{ fontSize: '11px', marginTop: '10px', color: '#777' }}>7/24 aktif canlı destek.</p>
                    </div>

                </div>

                <div className="footer-bottom">
                    <p>&copy; 2026 ALICCI. Tüm Hakları Saklıdır.</p>
                    <p style={{ fontSize: '11px', opacity: 0.6 }}>256-bit SSL Güvenli Ödeme Altyapısı</p>
                </div>
            </footer>

            {/* ==========================================
                YASAL POLİTİKALAR & İLETİŞİM MODALI
               ========================================== */}
            {(activeLegalModal || isLegalClosing) && (
                <div 
                    className="modal-backdrop" 
                    onClick={closeLegalModal}
                    style={{ 
                        zIndex: 1000008, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        animation: isLegalClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                >
                    <div 
                        className="modal-content-base legal-modal" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                            maxWidth: '650px', 
                            width: '90%',
                            padding: '30px', 
                            borderRadius: '12px',
                            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                            color: isDarkMode ? '#ffffff' : '#111111',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            border: isDarkMode ? '1px solid #333' : '1px solid #eee',
                            animation: isLegalClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards"
                        }}
                    >
                        <button 
                            className="close-modal close-modal-small" 
                            onClick={closeLegalModal}
                            style={{ color: isDarkMode ? '#fff' : '#000' }}
                        >
                            &times;
                        </button>

                        {/* 1. MESAFELİ SATIŞ SÖZLEŞMESİ */}
                        {activeLegalModal === 'terms' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase' }}>
                                    Mesafeli Satış Sözleşmesi
                                </h2>
                                <div className="legal-modal-body">
                                    <h3>1. TARAFLAR</h3>
                                    <p>İşbu Sözleşme, <strong>ALICCI Tekstil & Moda</strong> (Satıcı) ile alicci.com adresi üzerinden sipariş oluşturan Müşteri (Alıcı) arasında kurulmuştur.</p>

                                    <h3>2. SATICI BİLGİLERİ</h3>
                                    <p><strong>Unvan:</strong> ALICCI Brand</p>
                                    <p><strong>Adres:</strong> {STORE_ADDRESS}</p>
                                    <p><strong>E-Posta:</strong> {STORE_EMAIL}</p>
                                    <p><strong>Telefon:</strong> {STORE_PHONE}</p>

                                    <h3>3. KONU</h3>
                                    <p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait web sitesinden elektronik ortamda siparişini yaptığı ürünün satışı ve teslimi ile ilgili 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.</p>

                                    <h3>4. TESLİMAT VE SEVKİYAT</h3>
                                    <p>Sipariş edilen ürünler, onay aşamasından sonra en geç 24-48 saat içerisinde anlaşmalı kargo şirketine teslim edilir. Kargo takip bilgileri kullanıcıya SMS veya E-posta yoluyla iletilir.</p>

                                    <h3>5. CAYMA HAKKI</h3>
                                    <p>ALICI, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren <strong>14 (ondört) gün</strong> içinde hiçbir hukuki ve cezai sorumluluk üstlenmeksizin cayma hakkını kullanabilir.</p>
                                </div>
                            </div>
                        )}

                        {/* 2. GİZLİLİK VE ÇEREZ POLİTİKASI */}
                        {activeLegalModal === 'privacy' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase' }}>
                                    Gizlilik ve Çerez Politikası
                                </h2>
                                <div className="legal-modal-body">
                                    <h3>1. KİŞİSEL VERİLERİN KORUNMASI</h3>
                                    <p>ALICCI olarak kişisel verilerinizin güvenliğine yüksek önem veriyoruz. 6698 sayılı KVKK kapsamında, alışveriş yaparken paylaştığınız ad, soyad, e-posta, teslimat adresi ve telefon numaranız yalnızca siparişinizin tamamlanması amacıyla işlenir.</p>

                                    <h3>2. ÖDEME GÜVENLİĞİ (256-BIT SSL)</h3>
                                    <p>Kredi kartı bilgileriniz hiçbir şekilde ALICCI sunucularında saklanmaz. Ödeme işlemleri doğrudan 256-bit SSL sertifikalı Iyzico altyapısı üzerinden bankanızla sizin aranızda gerçekleşir.</p>

                                    <h3>3. ÇEREZ (COOKIE) KULLANIMI</h3>
                                    <p>Web sitemizde alışveriş deneyiminizi iyileştirmek, sepetinizi hatırlamak ve oturum tercihlerinizi kaydetmek amacıyla çerezler kullanılmaktadır. Dilediğiniz zaman tarayıcı ayarlarınızdan çerezleri engelleyebilirsiniz.</p>
                                </div>
                            </div>
                        )}

                        {/* 3. İPTAL VE İADE KOŞULLARI */}
                        {activeLegalModal === 'returns' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase' }}>
                                    İptal ve İade Koşulları
                                </h2>
                                <div className="legal-modal-body">
                                    <h3>1. İADE ŞARTLARI</h3>
                                    <p>ALICCI'dan satın aldığınız ürünleri, teslimat tarihinden itibaren <strong>14 gün</strong> içerisinde sebep göstermeksizin iade edebilir veya beden değişimi yapabilirsiniz.</p>

                                    <h3>2. İADE KOŞULLARI</h3>
                                    <p>• İade edilecek ürünlerin kullanılmamış, yıkanmamış, etiketi sökülmemiş ve tekrar satılabilir özelliğini kaybetmemiş olması gerekmektedir.</p>
                                    <p>• Ürün ile birlikte gönderilen orijinal ambalaj ve faturanın da iade paketinde bulunması zorunludur.</p>

                                    <h3>3. İADE SÜRECİ</h3>
                                    <p>İade talebinizi web sitemizdeki İletişim sayfasından veya WhatsApp Destek hattımızdan bize bildirebilirsiniz. Tarafınıza iletilecek iade kargo kodu ile ürünü ücretsiz geri gönderebilirsiniz.</p>

                                    <h3>4. ÜCRET İADESİ</h3>
                                    <p>İade edilen ürün depomuza ulaşıp kontrol edildikten sonra 3 iş günü içerisinde ücret iadesi bankanıza aktarılır. Banka prosedürlerine bağlı olarak hesabınıza yansıması 2-5 gün sürebilir.</p>
                                </div>
                            </div>
                        )}

                        {/* 4. İLETİŞİM VE DETAYLAR */}
                        {activeLegalModal === 'contact' && (
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '15px', textTransform: 'uppercase' }}>
                                    Kurumsal İletişim Bilgileri
                                </h2>
                                <div className="legal-modal-body">
                                    <p>Sorularınız, iş birlikleri veya sipariş desteği için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz:</p>
                                    
                                    <h3>AÇIK ADRES</h3>
                                    <p>📍 {STORE_ADDRESS}</p>

                                    <h3>E-POSTA ADRESİ</h3>
                                    <p>✉️ {STORE_EMAIL}</p>

                                    <h3>MÜŞTERİ HİZMETLERİ & WHATSAPP</h3>
                                    <p>📞 {STORE_PHONE}</p>

                                    <h3>ÇALIŞMA SAATLERİ</h3>
                                    <p>⏰ Pazartesi - Cuma: 09:00 - 18:00</p>
                                    <p>⏰ Cumartesi: 10:00 - 15:00</p>

                                    <div style={{ marginTop: '20px' }}>
                                        <a 
                                            href={`https://wa.me/${WHATSAPP_NUMBER}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="themed-social-button whatsapp-contact"
                                            style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}
                                        >
                                            WhatsApp Üzerinden Canlı Destek Al
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==========================================
                ÜRÜN DETAY MODALI
               ========================================== */}
            {(selectedProduct || isProductClosing) && selectedProduct && (
                <div
                    className="modal-backdrop"
                    onClick={closeProductModal}
                    style={{
                        animation: isProductClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards",
                        zIndex: 1000002
                    }}
                >
                    <div
                        className="modal-content-base product-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            animation: isProductClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards"
                        }}
                    >
                        <button className="close-modal" onClick={closeProductModal}>
                            &times;
                        </button>
                        <div className="product-modal-grid">
                            <div className="product-modal-image-wrapper">
                                <img
                                    key={currentModalImageIndex}
                                    src={selectedProduct.image[currentModalImageIndex]}
                                    alt={selectedProduct.name}
                                    className="product-modal-image animate-fadeIn"
                                />
                                {selectedProduct.image && selectedProduct.image.length > 1 && (
                                    <>
                                        <button
                                            className="modal-nav-glass-btn left"
                                            onClick={prevModalImage}
                                            aria-label="Önceki Görsel"
                                        >
                                            &#10094;
                                        </button>
                                        <button
                                            className="modal-nav-glass-btn right"
                                            onClick={nextModalImage}
                                            aria-label="Sonraki Görsel"
                                        >
                                            &#10095;
                                        </button>
                                        <div className="modal-image-dots">
                                            {selectedProduct.image.map((_, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`modal-dot ${idx === currentModalImageIndex ? "active" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentModalImageIndex(idx);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="product-modal-details">
                                <h2>{selectedProduct.name}</h2>
                                <p className="modal-price">{selectedProduct.price} TL</p>
                                <p className="modal-description">{selectedProduct.description || "Premium %100 Pamuk kumaş, özel kalıp ve zamansız tasarım."}</p>

                                <div className="size-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label>Beden Seçin:</label>
                                        <button
                                            type="button"
                                            className="find-my-size-btn"
                                            onClick={() => setShowSizeCalcModal(true)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: isDarkMode ? '#aaa' : '#555',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: 0
                                            }}
                                        >
                                            📐 Bedenimi Bul
                                        </button>
                                    </div>
                                    <div className="size-select">
                                        {["S", "M", "L", "XL"].map((size) => {
                                            const isSoldOut = selectedProduct.sold_out_sizes?.includes(size) || selectedProduct.stock === 0;
                                            return (
                                                <button
                                                    key={size}
                                                    disabled={isSoldOut}
                                                    className={`${selectedSize === size ? "selected" : ""} ${isSoldOut ? "size-sold-out" : ""}`}
                                                    onClick={() => setSelectedSize(size)}
                                                >
                                                    {size} {isSoldOut ? "(Tükendi)" : ""}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    className="add-to-cart-btn"
                                    onClick={handleAddToCart}
                                    disabled={selectedProduct.stock === 0}
                                >
                                    {selectedProduct.stock === 0 ? "TÜKENDİ" : "Sepete Ekle"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                AKILLI BEDEN SİHİRBAZI MODALI
               ========================================== */}
            {(showSizeCalcModal || isSizeCalcClosing) && (
                <div
                    className="modal-backdrop"
                    onClick={closeSizeCalcModal}
                    style={{
                        zIndex: 1000005,
                        animation: isSizeCalcClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                >
                    <div
                        className="modal-content-base size-calc-modal"
                        onClick={(e) => e.stopPropagation()}
                        onMouseMove={handleModalMouseMove}
                        onMouseLeave={handleModalMouseLeave}
                        style={{
                            ...modalTiltStyle,
                            animation: isSizeCalcClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards"
                        }}
                    >
                        <button className="close-modal close-modal-small" onClick={closeSizeCalcModal}>
                            &times;
                        </button>
                        <h3 className="size-calc-modal-title">📐 Akıllı Beden Sihirbazı</h3>
                        <p className="size-disclaimer">Vücut ölçülerinize ve kesim tercihinize göre en ideal bedeni öneriyoruz.</p>

                        <div className="size-calc-form">
                            <div className="calc-group">
                                <label>Boy: <strong>{calcHeight} cm</strong></label>
                                <input
                                    type="range"
                                    min="150"
                                    max="200"
                                    value={calcHeight}
                                    onChange={(e) => setCalcHeight(Number(e.target.value))}
                                />
                            </div>

                            <div className="calc-group">
                                <label>Kilo: <strong>{calcWeight} kg</strong></label>
                                <input
                                    type="range"
                                    min="40"
                                    max="120"
                                    value={calcWeight}
                                    onChange={(e) => setCalcWeight(Number(e.target.value))}
                                />
                            </div>

                            <div className="calc-group">
                                <label>Kalıp Tercihi:</label>
                                <div className="fit-options">
                                    <button
                                        className={`fit-btn ${calcFit === 'regular' ? 'active' : ''}`}
                                        onClick={() => setCalcFit('regular')}
                                    >
                                        Standart (Regular)
                                    </button>
                                    <button
                                        className={`fit-btn ${calcFit === 'oversize' ? 'active' : ''}`}
                                        onClick={() => setCalcFit('oversize')}
                                    >
                                        Oversize / Dökümlü
                                    </button>
                                </div>
                            </div>

                            <div className="size-calc-result-box">
                                <span>Önerilen Bedeniniz:</span>
                                <strong className="recommended-size-tag">
                                    {getRecommendedSize(calcHeight, calcWeight, calcFit)}
                                </strong>
                            </div>

                            <button
                                className="apply-recommended-size-btn"
                                onClick={() => {
                                    const recSize = getRecommendedSize(calcHeight, calcWeight, calcFit);
                                    setSelectedSize(recSize);
                                    closeSizeCalcModal();
                                    showToast(`Bedeniniz (${recSize}) seçildi!`);
                                }}
                            >
                                Bu Bedeni Seç ({getRecommendedSize(calcHeight, calcWeight, calcFit)})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                KARGO TAKİP MODALI
               ========================================== */}
            {(showTrackingModal || isTrackingClosing) && (
                <div
                    className="modal-backdrop"
                    onClick={closeTrackingModal}
                    style={{
                        zIndex: 1000004,
                        animation: isTrackingClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                >
                    <div
                        className="modal-content-base tracking-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            animation: isTrackingClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards"
                        }}
                    >
                        <button className="close-modal close-modal-small" onClick={closeTrackingModal}>
                            &times;
                        </button>
                        <h3>📦 Kargo Takibi & Sipariş Sorgulama</h3>
                        <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '15px' }}>
                            Siparişinizi sorgulamak için ALC-XXXXXX formatındaki sipariş kodunuzu girin.
                        </p>

                        <div className="tracking-search-box">
                            <input
                                type="text"
                                placeholder="Sipariş Kodu (Örn: ALC-123456)"
                                value={trackingCodeInput}
                                onChange={(e) => setTrackingCodeInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()}
                            />
                            <button onClick={handleTrackOrder} disabled={isTrackingLoading}>
                                {isTrackingLoading ? "Aranıyor..." : "Sorgula"}
                            </button>
                        </div>

                        {trackingError && <p className="tracking-error" style={{ color: '#ff3b30', fontSize: '13px' }}>{trackingError}</p>}

                        {searchedOrder && (
                            <div className="searched-order-details" style={{ marginTop: '20px', borderTop: '1px solid rgba(128,128,128,0.2)', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0 }}>Sipariş #{searchedOrder.order_code}</h4>
                                    <span className="order-status-badge" style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: '#34d399', color: '#000' }}>
                                        {searchedOrder.status || "Hazırlanıyor"}
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', opacity: 0.7, margin: '5px 0 15px' }}>
                                    Tarih: {new Date(searchedOrder.created_at || Date.now()).toLocaleDateString('tr-TR')}
                                </p>

                                <div className="order-items-list" style={{ fontSize: '13px', marginBottom: '15px' }}>
                                    <strong>Ürünler:</strong>
                                    <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                                        {(searchedOrder.cart_items || []).map((item, i) => (
                                            <li key={i}>{item.name} ({item.size}) x{item.quantity} - {item.price} TL</li>
                                        ))}
                                    </ul>
                                    <strong>Toplam Tutar: {searchedOrder.total_price} TL</strong>
                                </div>

                                <div className="animated-truck-road">
                                    <div className={`animated-truck ${searchedOrder.status === 'Onay Bekleniyor' ? 'waiting' : ''}`}>
                                        <svg width="32" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==========================================
                SİPARİŞ SEÇENEKLERİ MODALI
               ========================================== */}
            {showOrderOptionsModal && (
                <div className="modal-backdrop" onClick={closeOrderOptionsModal} style={{ zIndex: 1000003 }}>
                    <div className="modal-content-base order-options-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeOrderOptionsModal}>
                            &times;
                        </button>
                        <h3>Sipariş Yöntemi Seçin</h3>
                        <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>
                            Siparişinizi oluşturmak için tercih ettiğiniz iletişim kanalını seçin.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                className="themed-social-button whatsapp-contact"
                                onClick={() => handleCreateOrder('whatsapp')}
                                style={{ border: 'none', cursor: 'pointer', padding: '14px', borderRadius: '6px', fontWeight: 'bold' }}
                            >
                                💬 WhatsApp ile Siparişi Tamamla
                            </button>
                            <button
                                className="themed-social-button instagram-contact"
                                onClick={() => handleCreateOrder('instagram')}
                                style={{ border: 'none', cursor: 'pointer', padding: '14px', borderRadius: '6px', fontWeight: 'bold' }}
                            >
                                📸 Instagram DM ile Siparişi Tamamla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                SİPARİŞ ONAY MODALI
               ========================================== */}
            {showConfirmationModal && (
                <div className="modal-backdrop" onClick={closeConfirmationModal} style={{ zIndex: 1000006 }}>
                    <div className="modal-content-base confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal close-modal-small" onClick={closeConfirmationModal}>
                            &times;
                        </button>
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                            <h3>Siparişiniz Alındı!</h3>
                            <p style={{ fontSize: '13px', opacity: 0.85, margin: '15px 0' }}>
                                Sipariş kodunuz kopyalandı. Bize WhatsApp veya Instagram DM üzerinden ileterek siparişinizi onaylayabilirsiniz.
                            </p>
                            <button
                                onClick={closeConfirmationModal}
                                style={{ padding: '12px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Anladım
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                IYZICO ÖDEME MODALI
               ========================================== */}
            {(showIyzicoModal || isIyzicoClosing) && (
                <div
                    className="modal-backdrop"
                    onClick={closeIyzicoModal}
                    style={{
                        zIndex: 1000007,
                        animation: isIyzicoClosing ? "fade-out 0.3s ease forwards" : "fade-in 0.3s ease forwards"
                    }}
                >
                    <div
                        className="modal-content-base iyzico-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            animation: isIyzicoClosing ? "slide-down 0.3s ease forwards" : "slide-up 0.3s ease forwards"
                        }}
                    >
                        <button className="close-modal close-modal-small" onClick={closeIyzicoModal}>
                            &times;
                        </button>
                        {isIyzicoLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <p style={{ fontWeight: 'bold' }}>Ödeme Formu Yükleniyor...</p>
                                <p style={{ fontSize: '12px', opacity: 0.6 }}>Lütfen bekleyiniz, güvenli ödeme sayfasına yönlendiriliyorsunuz.</p>
                            </div>
                        ) : (
                            <div id="iyzipay-checkout-form" className="responsive" dangerouslySetInnerHTML={{ __html: iyzicoFormHtml }} />
                        )}
                    </div>
                </div>
            )}

            {/* ==========================================
                AI CHATBOT BİLEŞENİ
               ========================================== */}
            <Chatbot isOpen={isChatbotOpen} setIsOpen={toggleChatbot} />

            {/* ==========================================
                TOAST BİLDİRİMİ
               ========================================== */}
            {toast && <div className="toast-container">{toast}</div>}
        </>
    );
}

export default App;
