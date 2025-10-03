import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  memo,
} from "react";
import {
  Clock,
  Cloud,
  FileText,
  Bell,
  X,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calculator,
  DollarSign,
  Globe,
} from "lucide-react";

// ==================== CONTEXT ====================
const AppContext = createContext(null);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

// ==================== HOOKS ====================
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  return [storedValue, setValue];
};

const usePomodoro = (settings) => {
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (settings.soundEnabled) {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGa87eeaSwkNUKrj8LdjHAU5kdfy0HouBSR3x/DdkD8KFF+06OunVBQLSKHg8r5sIQUrgc7y2Yk2CBhlu+3nmk0JDFCq4/C3YxwFOZHX8tB6LgUkd8fw3ZA/ChRftOjrp1QVC0ih4PK+bCEFK4HO8tmJNggYZbvt55pNCQxQquPwt2McBTmR1/LQei4FJHfH8N2QPwoUX7To66dUFQtIoeDyvmwhBSuBzvLZiTYIGGW77eeaTQkMUKrj8LdjHAU5kdfyz3ouBSR3x/DdkD8KFF+06OunVBULS"
        );
        audio.play().catch(() => {});
      }

      if (!isBreak) {
        setCompletedSessions((s) => s + 1);
        setIsBreak(true);
        setTimeLeft(settings.breakDuration * 60);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("¡Descanso!", {
            body: "Tiempo de tomar un descanso",
          });
        }
      } else {
        setIsBreak(false);
        setTimeLeft(settings.workDuration * 60);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("¡A trabajar!", {
            body: "Tiempo de volver al trabajo",
          });
        }
      }
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, settings]);

  const toggle = useCallback(() => setIsActive((a) => !a), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setTimeLeft(settings.workDuration * 60);
    setIsBreak(false);
  }, [settings.workDuration]);

  return { timeLeft, isActive, isBreak, completedSessions, toggle, reset };
};

const useWeather = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=13.69&longitude=-89.19&current=temperature_2m,weather_code&timezone=auto"
        );
        const data = await response.json();
        setWeather(data);
        setError(null);
      } catch (err) {
        setError("No se pudo cargar el clima");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading, error };
};

const useCurrency = () => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        const data = await response.json();
        setRates(data.rates);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  return { rates, loading };
};

// ==================== PROVIDER ====================
const AppProvider = ({ children }) => {
  const [theme, setTheme] = useLocalStorage(
    "betterdesk-theme",
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [widgets, setWidgets] = useLocalStorage("betterdesk-widgets", []);
  const [notes, setNotes] = useLocalStorage("betterdesk-notes", []);
  const [reminders, setReminders] = useLocalStorage("betterdesk-reminders", []);
  const [pomodoroSettings, setPomodoroSettings] = useLocalStorage(
    "betterdesk-pomodoro",
    {
      workDuration: 25,
      breakDuration: 5,
      soundEnabled: true,
    }
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, [setTheme]);

  const addWidget = useCallback(
    (type) => {
      const sizes = {
        pomodoro: { width: 420, height: 550 },
        clima: { width: 380, height: 400 },
        notas: { width: 450, height: 600 },
        recordatorios: { width: 480, height: 600 },
        calculadora: { width: 320, height: 480 },
        monedas: { width: 400, height: 520 },
        reloj: { width: 500, height: 450 },
      };

      const newWidget = {
        id: `${type}-${Date.now()}`,
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        isOpen: true,
        position: { x: Math.random() * 150 + 100, y: Math.random() * 100 + 80 },
        size: sizes[type] || { width: 400, height: 500 },
      };
      setWidgets((w) => [...w, newWidget]);
    },
    [setWidgets]
  );

  const removeWidget = useCallback(
    (id) => {
      setWidgets((w) => w.filter((widget) => widget.id !== id));
    },
    [setWidgets]
  );

  const toggleWidget = useCallback(
    (id) => {
      setWidgets((w) =>
        w.map((widget) =>
          widget.id === id ? { ...widget, isOpen: !widget.isOpen } : widget
        )
      );
    },
    [setWidgets]
  );

  const updateWidgetPosition = useCallback(
    (id, position) => {
      setWidgets((w) =>
        w.map((widget) => (widget.id === id ? { ...widget, position } : widget))
      );
    },
    [setWidgets]
  );

  const addNote = useCallback(
    (content) => {
      const newNote = {
        id: Date.now().toString(),
        content,
        timestamp: Date.now(),
      };
      setNotes((n) => [newNote, ...n]);
    },
    [setNotes]
  );

  const deleteNote = useCallback(
    (id) => {
      setNotes((n) => n.filter((note) => note.id !== id));
    },
    [setNotes]
  );

  const addReminder = useCallback(
    (text, time) => {
      const newReminder = {
        id: Date.now().toString(),
        text,
        time,
        completed: false,
      };
      setReminders((r) => [...r, newReminder]);
    },
    [setReminders]
  );

  const toggleReminder = useCallback(
    (id) => {
      setReminders((r) =>
        r.map((reminder) =>
          reminder.id === id
            ? { ...reminder, completed: !reminder.completed }
            : reminder
        )
      );
    },
    [setReminders]
  );

  const deleteReminder = useCallback(
    (id) => {
      setReminders((r) => r.filter((reminder) => reminder.id !== id));
    },
    [setReminders]
  );

  const updatePomodoroSettings = useCallback(
    (settings) => {
      setPomodoroSettings((s) => ({ ...s, ...settings }));
    },
    [setPomodoroSettings]
  );

  const value = useMemo(
    () => ({
      state: { theme, widgets, notes, reminders, pomodoroSettings },
      toggleTheme,
      addWidget,
      removeWidget,
      toggleWidget,
      updateWidgetPosition,
      addNote,
      deleteNote,
      addReminder,
      toggleReminder,
      deleteReminder,
      updatePomodoroSettings,
    }),
    [
      theme,
      widgets,
      notes,
      reminders,
      pomodoroSettings,
      toggleTheme,
      addWidget,
      removeWidget,
      toggleWidget,
      updateWidgetPosition,
      addNote,
      deleteNote,
      addReminder,
      toggleReminder,
      deleteReminder,
      updatePomodoroSettings,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ==================== COMPONENTS ====================
const Widget = memo(({ widget, children }) => {
  const { removeWidget, toggleWidget, updateWidgetPosition } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest(".widget-header")) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - widget.position.x,
        y: e.clientY - widget.position.y,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateWidgetPosition(widget.id, {
        x: Math.max(
          0,
          Math.min(
            e.clientX - dragOffset.x,
            window.innerWidth - widget.size.width
          )
        ),
        y: Math.max(
          0,
          Math.min(e.clientY - dragOffset.y, window.innerHeight - 100)
        ),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, widget.id, widget.size, updateWidgetPosition]);

  return (
    <div
      className={`widget ${widget.isOpen ? "widget-open" : "widget-closed"} ${
        isDragging ? "dragging" : ""
      }`}
      style={{
        left: `${widget.position.x}px`,
        top: `${widget.position.y}px`,
        width: widget.isOpen ? `${widget.size.width}px` : "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <div className="widget-controls">
          <button
            onClick={() => toggleWidget(widget.id)}
            aria-label="Minimizar"
          >
            {widget.isOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          <button onClick={() => removeWidget(widget.id)} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      </div>
      {widget.isOpen && <div className="widget-content">{children}</div>}
    </div>
  );
});

const PomodoroWidget = memo(({ widget }) => {
  const { state, updatePomodoroSettings } = useApp();
  const { timeLeft, isActive, isBreak, completedSessions, toggle, reset } =
    usePomodoro(state.pomodoroSettings);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Widget widget={widget}>
      <div className="pomodoro-widget">
        <div className="pomodoro-display">
          <div
            className={`pomodoro-timer ${isActive ? "active" : ""} ${
              isBreak ? "break" : "work"
            }`}
          >
            <span className="time">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="label">{isBreak ? "Descanso" : "Trabajo"}</span>
          </div>
          <div className="sessions">Sesiones: {completedSessions}</div>
        </div>
        <div className="pomodoro-controls">
          <button onClick={toggle} className="btn-primary">
            {isActive ? <Pause size={20} /> : <Play size={20} />}
            {isActive ? "Pausar" : "Iniciar"}
          </button>
          <button onClick={reset} className="btn-secondary">
            <RotateCcw size={20} /> Reiniciar
          </button>
        </div>
        <div className="pomodoro-settings">
          <label>
            Trabajo (min):
            <input
              type="number"
              min="1"
              max="60"
              value={state.pomodoroSettings.workDuration}
              onChange={(e) =>
                updatePomodoroSettings({
                  workDuration: parseInt(e.target.value) || 25,
                })
              }
            />
          </label>
          <label>
            Descanso (min):
            <input
              type="number"
              min="1"
              max="30"
              value={state.pomodoroSettings.breakDuration}
              onChange={(e) =>
                updatePomodoroSettings({
                  breakDuration: parseInt(e.target.value) || 5,
                })
              }
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={state.pomodoroSettings.soundEnabled}
              onChange={(e) =>
                updatePomodoroSettings({ soundEnabled: e.target.checked })
              }
            />
            Sonido
          </label>
        </div>
      </div>
    </Widget>
  );
});

const WeatherParticles = memo(({ weatherCode }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    let count = 0;

    if (weatherCode >= 51 && weatherCode <= 67) {
      count = 50;
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      count = 40;
    } else if (weatherCode >= 80) {
      count = 70;
    }

    if (count > 0) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 1 + Math.random() * 2,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }

    return () => setParticles([]);
  }, [weatherCode]);

  if (particles.length === 0) return null;

  const isSnow = weatherCode >= 71 && weatherCode <= 77;

  return (
    <div className="weather-particles">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`particle ${isSnow ? "snow" : "rain"}`}
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
});

const ClimaWidget = memo(({ widget }) => {
  const { weather, loading, error } = useWeather();

  const getWeatherEmoji = (code) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    return "⛈️";
  };

  return (
    <Widget widget={widget}>
      <div className="clima-widget">
        {loading && <div className="loading">Cargando clima...</div>}
        {error && <div className="error">{error}</div>}
        {weather && !loading && (
          <>
            <WeatherParticles
              weatherCode={weather.current?.weather_code || 0}
            />
            <div className="weather-icon">
              {getWeatherEmoji(weather.current?.weather_code || 0)}
            </div>
            <div className="temperature">
              {Math.round(weather.current?.temperature_2m || 0)}°C
            </div>
            <div className="location">San Salvador, SV</div>
          </>
        )}
      </div>
    </Widget>
  );
});

const NotasWidget = memo(({ widget }) => {
  const { state, addNote, deleteNote } = useApp();
  const [newNote, setNewNote] = useState("");

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNote(newNote.trim());
      setNewNote("");
    }
  };

  return (
    <Widget widget={widget}>
      <div className="notas-widget">
        <div className="note-input">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escribe una nota..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleAddNote();
            }}
          />
          <button onClick={handleAddNote} className="btn-primary">
            <Plus size={16} /> Agregar
          </button>
        </div>
        <div className="notes-list">
          {state.notes.length === 0 && (
            <div className="empty-state">No hay notas aún</div>
          )}
          {state.notes.map((note) => (
            <div key={note.id} className="note-item">
              <p>{note.content}</p>
              <div className="note-footer">
                <span className="note-date">
                  {new Date(note.timestamp).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="btn-icon"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
});

const RecordatoriosWidget = memo(({ widget }) => {
  const { state, addReminder, toggleReminder, deleteReminder } = useApp();
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  const handleAddReminder = () => {
    if (newReminderText.trim() && newReminderTime) {
      addReminder(newReminderText.trim(), newReminderTime);
      setNewReminderText("");
      setNewReminderTime("");
    }
  };

  return (
    <Widget widget={widget}>
      <div className="recordatorios-widget">
        <div className="reminder-input">
          <input
            type="text"
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="Recordatorio..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && newReminderTime) handleAddReminder();
            }}
          />
          <input
            type="time"
            value={newReminderTime}
            onChange={(e) => setNewReminderTime(e.target.value)}
          />
          <button onClick={handleAddReminder} className="btn-primary">
            <Plus size={16} />
          </button>
        </div>
        <div className="reminders-list">
          {state.reminders.length === 0 && (
            <div className="empty-state">No hay recordatorios</div>
          )}
          {state.reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`reminder-item ${
                reminder.completed ? "completed" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={reminder.completed}
                onChange={() => toggleReminder(reminder.id)}
              />
              <div className="reminder-content">
                <span>{reminder.text}</span>
                <span className="reminder-time">{reminder.time}</span>
              </div>
              <button
                onClick={() => deleteReminder(reminder.id)}
                className="btn-icon"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
});

const CalculadoraWidget = memo(({ widget }) => {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op) => {
    const current = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(current);
    } else if (operation) {
      const result = calculate(prevValue, current, operation);
      setDisplay(String(result));
      setPrevValue(result);
    }
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b !== 0 ? a / b : "Error";
      default:
        return b;
    }
  };

  const handleEquals = () => {
    if (operation && prevValue !== null) {
      const result = calculate(prevValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPrevValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay("0.");
      setNewNumber(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  return (
    <Widget widget={widget}>
      <div className="calculadora-widget">
        <div className="calc-display">{display}</div>
        <div className="calc-grid">
          <button onClick={handleClear} className="calc-btn calc-clear">
            C
          </button>
          <button
            onClick={() => handleOperation("÷")}
            className="calc-btn calc-op"
          >
            ÷
          </button>
          <button
            onClick={() => handleOperation("×")}
            className="calc-btn calc-op"
          >
            ×
          </button>
          <button
            onClick={() => handleOperation("-")}
            className="calc-btn calc-op"
          >
            -
          </button>

          <button onClick={() => handleNumber("7")} className="calc-btn">
            7
          </button>
          <button onClick={() => handleNumber("8")} className="calc-btn">
            8
          </button>
          <button onClick={() => handleNumber("9")} className="calc-btn">
            9
          </button>
          <button
            onClick={() => handleOperation("+")}
            className="calc-btn calc-op calc-plus"
          >
            +
          </button>

          <button onClick={() => handleNumber("4")} className="calc-btn">
            4
          </button>
          <button onClick={() => handleNumber("5")} className="calc-btn">
            5
          </button>
          <button onClick={() => handleNumber("6")} className="calc-btn">
            6
          </button>
          <button onClick={handleEquals} className="calc-btn calc-equals">
            =
          </button>

          <button onClick={() => handleNumber("1")} className="calc-btn">
            1
          </button>
          <button onClick={() => handleNumber("2")} className="calc-btn">
            2
          </button>
          <button onClick={() => handleNumber("3")} className="calc-btn">
            3
          </button>
          <button onClick={handleDecimal} className="calc-btn">
            .
          </button>

          <button
            onClick={() => handleNumber("0")}
            className="calc-btn calc-zero"
          >
            0
          </button>
        </div>
      </div>
    </Widget>
  );
});

const MonedasWidget = memo(({ widget }) => {
  const { rates, loading } = useCurrency();
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");

  const currencies = [
    { code: "USD", name: "Dólar", flag: "🇺🇸" },
    { code: "EUR", name: "Euro", flag: "🇪🇺" },
    { code: "GBP", name: "Libra", flag: "🇬🇧" },
    { code: "JPY", name: "Yen", flag: "🇯🇵" },
    { code: "CNY", name: "Yuan", flag: "🇨🇳" },
    { code: "CAD", name: "Dólar CAD", flag: "🇨🇦" },
    { code: "AUD", name: "Dólar AUD", flag: "🇦🇺" },
    { code: "CHF", name: "Franco", flag: "🇨🇭" },
    { code: "MXN", name: "Peso MXN", flag: "🇲🇽" },
  ];

  const convert = () => {
    if (!rates || !amount) return 0;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return 0;

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    const result = (amountNum / fromRate) * toRate;
    return result.toFixed(2);
  };

  return (
    <Widget widget={widget}>
      <div className="monedas-widget">
        {loading ? (
          <div className="loading">Cargando tasas...</div>
        ) : (
          <>
            <div className="currency-input-group">
              <label>Cantidad</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Cantidad"
              />
            </div>
            <div className="currency-selector">
              <div className="currency-select-group">
                <label>De</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="currency-arrow">→</div>
              <div className="currency-select-group">
                <label>A</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="currency-result">
              <div className="result-label">Resultado</div>
              <div className="result-amount">
                {convert()} {toCurrency}
              </div>
            </div>
            {rates && (
              <div className="exchange-rate">
                1 {fromCurrency} ={" "}
                {(rates[toCurrency] / rates[fromCurrency]).toFixed(4)}{" "}
                {toCurrency}
              </div>
            )}
          </>
        )}
      </div>
    </Widget>
  );
});

const RelojWidget = memo(({ widget }) => {
  const [time, setTime] = useState(new Date());

  const timezones = [
    { name: "San Salvador", zone: "America/El_Salvador", flag: "🇸🇻" },
    { name: "New York", zone: "America/New_York", flag: "🇺🇸" },
    { name: "London", zone: "Europe/London", flag: "🇬🇧" },
    { name: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
    { name: "Sydney", zone: "Australia/Sydney", flag: "🇦🇺" },
    { name: "Dubai", zone: "Asia/Dubai", flag: "🇦🇪" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeInZone = (zone) => {
    return time.toLocaleTimeString("es-ES", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Widget widget={widget}>
      <div className="reloj-widget">
        {timezones.map((tz) => (
          <div key={tz.zone} className="timezone-item">
            <div className="timezone-info">
              <span className="timezone-flag">{tz.flag}</span>
              <span className="timezone-name">{tz.name}</span>
            </div>
            <div className="timezone-time">{getTimeInZone(tz.zone)}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
});

// ==================== MAIN APP ====================
const BetterDesk = () => {
  const { state, toggleTheme, addWidget } = useApp();
  const [time, setTime] = useState(new Date());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="betterdesk">
      <div className="background-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div
          className="mouse-gradient"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        ></div>
        <div className="grid-overlay"></div>
      </div>
      <div className="topbar">
        <div className="logo">BetterDesk</div>
        <div className="clock">
          {time.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" • "}
          {time.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="controls">
          <button
            onClick={toggleTheme}
            className="btn-icon"
            aria-label="Cambiar tema"
          >
            {state.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      <div className="widgets-container">
        {state.widgets.map((widget) => {
          switch (widget.type) {
            case "pomodoro":
              return <PomodoroWidget key={widget.id} widget={widget} />;
            case "clima":
              return <ClimaWidget key={widget.id} widget={widget} />;
            case "notas":
              return <NotasWidget key={widget.id} widget={widget} />;
            case "recordatorios":
              return <RecordatoriosWidget key={widget.id} widget={widget} />;
            case "calculadora":
              return <CalculadoraWidget key={widget.id} widget={widget} />;
            case "monedas":
              return <MonedasWidget key={widget.id} widget={widget} />;
            case "reloj":
              return <RelojWidget key={widget.id} widget={widget} />;
            default:
              return null;
          }
        })}
        {state.widgets.length === 0 && (
          <div className="welcome-message">
            <h2>¡Bienvenido a BetterDesk!</h2>
            <p>Agrega widgets desde el menú inferior para comenzar</p>
          </div>
        )}
      </div>

      <div className="widget-menu">
        <button onClick={() => addWidget("pomodoro")} className="menu-item">
          <Clock size={20} /> Pomodoro
        </button>
        <button onClick={() => addWidget("clima")} className="menu-item">
          <Cloud size={20} /> Clima
        </button>
        <button onClick={() => addWidget("notas")} className="menu-item">
          <FileText size={20} /> Notas
        </button>
        <button
          onClick={() => addWidget("recordatorios")}
          className="menu-item"
        >
          <Bell size={20} /> Recordatorios
        </button>
        <button onClick={() => addWidget("calculadora")} className="menu-item">
          <Calculator size={20} /> Calculadora
        </button>
        <button onClick={() => addWidget("monedas")} className="menu-item">
          <DollarSign size={20} /> Monedas
        </button>
        <button onClick={() => addWidget("reloj")} className="menu-item">
          <Globe size={20} /> Reloj Mundial
        </button>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root[data-theme="light"] {
          --bg-primary: #f0f2f5;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f9f9f9;
          --text-primary: #1d1d1f;
          --text-secondary: #6e6e73;
          --border: #d2d2d7;
          --accent: #0071e3;
          --accent-hover: #0077ed;
          --success: #34c759;
          --danger: #ff3b30;
          --shadow: rgba(0, 0, 0, 0.1);
          --widget-bg: rgba(255, 255, 255, 0.95);
          --orb-1: rgba(59, 130, 246, 0.3);
          --orb-2: rgba(139, 92, 246, 0.3);
          --orb-3: rgba(236, 72, 153, 0.3);
        }

        :root[data-theme="dark"] {
          --bg-primary: #0a0a0f;
          --bg-secondary: #1c1c1e;
          --bg-tertiary: #2c2c2e;
          --text-primary: #f5f5f7;
          --text-secondary: #a1a1a6;
          --border: #38383a;
          --accent: #0a84ff;
          --accent-hover: #409cff;
          --success: #32d74b;
          --danger: #ff453a;
          --shadow: rgba(0, 0, 0, 0.5);
          --widget-bg: rgba(28, 28, 30, 0.85);
          --orb-1: rgba(59, 130, 246, 0.15);
          --orb-2: rgba(139, 92, 246, 0.15);
          --orb-3: rgba(236, 72, 153, 0.15);
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
          margin: 0;
          padding: 0;
        }

        .betterdesk {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .background-animation {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float-orb 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: var(--orb-1);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: var(--orb-2);
          top: 50%;
          right: -100px;
          animation-delay: 7s;
        }

        .orb-3 {
          width: 450px;
          height: 450px;
          background: var(--orb-3);
          bottom: -150px;
          left: 30%;
          animation-delay: 14s;
        }

        .mouse-gradient {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          transition: opacity 0.3s;
          filter: blur(60px);
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 50px 50px;
          opacity: 0.03;
        }

        @keyframes float-orb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(100px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-50px, 100px) scale(0.9);
          }
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px);
          z-index: 100;
          position: relative;
        }

        .logo {
          font-size: 18px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent), var(--success));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .clock {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .controls {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg-tertiary);
          transform: scale(1.05);
        }

        .btn-icon:active {
          transform: scale(0.95);
        }

        .widgets-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .welcome-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: var(--text-secondary);
          z-index: 2;
        }

        .welcome-message h2 {
          font-size: 32px;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .widget {
          position: absolute;
          background: var(--widget-bg);
          backdrop-filter: blur(30px);
          border-radius: 16px;
          box-shadow: 0 8px 32px var(--shadow);
          border: 1px solid var(--border);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .widget.dragging {
          cursor: move;
          z-index: 1000;
          box-shadow: 0 20px 60px var(--shadow);
          transform: scale(1.02);
        }

        .widget-open {
          animation: widgetOpen 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes widgetOpen {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .widget-header {
          padding: 14px 18px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
          user-select: none;
        }

        .widget-header h3 {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
        }

        .widget-controls {
          display: flex;
          gap: 4px;
        }

        .widget-controls button {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .widget-controls button:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .widget-content {
          padding: 20px;
          max-height: 550px;
          overflow-y: auto;
        }

        .widget-content::-webkit-scrollbar {
          width: 8px;
        }

        .widget-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .widget-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }

        .widget-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }

        .pomodoro-widget {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .pomodoro-display {
          text-align: center;
        }

        .pomodoro-timer {
          width: 220px;
          height: 220px;
          margin: 0 auto;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 5px solid var(--border);
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
        }

        .pomodoro-timer::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent, var(--accent));
          opacity: 0;
          transition: opacity 0.4s;
        }

        .pomodoro-timer.active.work::before {
          opacity: 0.1;
          animation: rotate 3s linear infinite;
        }

        .pomodoro-timer.active.break::before {
          background: conic-gradient(from 0deg, transparent, var(--success));
          opacity: 0.1;
          animation: rotate 3s linear infinite;
        }

        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }

        .pomodoro-timer.active.work {
          border-color: var(--accent);
          box-shadow: 0 0 40px rgba(10, 132, 255, 0.4);
        }

        .pomodoro-timer.active.break {
          border-color: var(--success);
          box-shadow: 0 0 40px rgba(50, 215, 75, 0.4);
        }

        .pomodoro-timer .time {
          font-size: 52px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          z-index: 1;
        }

        .pomodoro-timer .label {
          font-size: 15px;
          color: var(--text-secondary);
          margin-top: 8px;
          font-weight: 500;
          z-index: 1;
        }

        .sessions {
          margin-top: 16px;
          font-size: 15px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .pomodoro-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-primary {
          background: var(--accent);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(10, 132, 255, 0.2);
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10, 132, 255, 0.3);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border);
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          background: var(--bg-secondary);
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .btn-secondary:active {
          transform: translateY(0);
        }

        .pomodoro-settings {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .pomodoro-settings label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .pomodoro-settings input[type="number"] {
          width: 70px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          transition: border 0.2s;
        }

        .pomodoro-settings input[type="number"]:focus {
          outline: none;
          border-color: var(--accent);
        }

        .pomodoro-settings .checkbox {
          cursor: pointer;
        }

        .pomodoro-settings input[type="checkbox"] {
          margin-left: 8px;
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .weather-particles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }

        .particle {
          position: absolute;
          width: 2px;
          background: linear-gradient(to bottom, rgba(174, 194, 224, 0.8), rgba(174, 194, 224, 0.2));
          animation: fall linear infinite;
          top: -10px;
        }

        .particle.rain {
          height: 20px;
        }

        .particle.snow {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: snowfall linear infinite;
        }

        @keyframes fall {
          to {
            transform: translateY(calc(100vh + 20px));
          }
        }

        @keyframes snowfall {
          to {
            transform: translateY(calc(100vh + 20px)) rotate(360deg);
            opacity: 0;
          }
        }

        .clima-widget {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 30px 0;
        }

        .clima-widget > *:not(.weather-particles) {
          position: relative;
          z-index: 2;
        }

        .weather-icon {
          font-size: 100px;
          animation: float 4s ease-in-out infinite;
          filter: drop-shadow(0 10px 20px var(--shadow));
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .temperature {
          font-size: 56px;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .location {
          font-size: 16px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .loading, .error {
          padding: 50px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 15px;
        }

        .error {
          color: var(--danger);
        }

        .notas-widget {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .note-input {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .note-input textarea {
          width: 100%;
          padding: 14px;
          border: 2px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          transition: all 0.2s;
        }

        .note-input textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
        }

        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 420px;
          overflow-y: auto;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .note-item {
          padding: 14px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          border: 1px solid var(--border);
          transition: all 0.3s;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .note-item:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 12px var(--shadow);
          transform: translateY(-2px);
        }

        .note-item p {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 10px;
          word-wrap: break-word;
          color: var(--text-primary);
        }

        .note-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .note-date {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .recordatorios-widget {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .reminder-input {
          display: flex;
          gap: 8px;
        }

        .reminder-input input[type="text"] {
          flex: 1;
          padding: 12px 14px;
          border: 2px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 14px;
          transition: all 0.2s;
        }

        .reminder-input input[type="time"] {
          padding: 12px 14px;
          border: 2px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 14px;
          transition: all 0.2s;
        }

        .reminder-input input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
        }

        .reminders-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 450px;
          overflow-y: auto;
        }

        .reminder-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          border: 1px solid var(--border);
          transition: all 0.3s;
          animation: slideIn 0.3s ease;
        }

        .reminder-item:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .reminder-item.completed {
          opacity: 0.5;
        }

        .reminder-item.completed .reminder-content span:first-child {
          text-decoration: line-through;
        }

        .reminder-item input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: var(--accent);
        }

        .reminder-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .reminder-content span:first-child {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .reminder-time {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .calculadora-widget {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calc-display {
          background: var(--bg-tertiary);
          padding: 24px 18px;
          border-radius: 12px;
          text-align: right;
          font-size: 32px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          min-height: 60px;
          word-break: break-all;
          border: 2px solid var(--border);
        }

        .calc-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .calc-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 20px;
          border-radius: 12px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calc-btn:hover {
          background: var(--bg-secondary);
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .calc-btn:active {
          transform: scale(0.95);
        }

        .calc-clear {
          grid-column: span 2;
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }

        .calc-clear:hover {
          background: #ff4d42;
        }

        .calc-op {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .calc-op:hover {
          background: var(--accent-hover);
        }

        .calc-equals {
          grid-column: span 1;
          grid-row: span 2;
          background: var(--success);
          color: white;
          border-color: var(--success);
        }

        .calc-equals:hover {
          background: #3ee553;
        }

        .calc-zero {
          grid-column: span 2;
        }

        .monedas-widget {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .currency-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .currency-input-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .currency-input-group input {
          padding: 14px;
          border: 2px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .currency-input-group input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
        }

        .currency-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .currency-select-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .currency-select-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .currency-select-group select {
          padding: 14px;
          border: 2px solid var(--border);
          border-radius: 10px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .currency-select-group select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1);
        }

        .currency-arrow {
          font-size: 24px;
          color: var(--text-secondary);
          margin-top: 28px;
        }

        .currency-result {
          background: var(--bg-tertiary);
          padding: 24px;
          border-radius: 12px;
          border: 2px solid var(--border);
          text-align: center;
        }

        .result-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .result-amount {
          font-size: 36px;
          font-weight: 700;
          color: var(--accent);
          font-variant-numeric: tabular-nums;
        }

        .exchange-rate {
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 8px;
        }

        .reloj-widget {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .timezone-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          border: 1px solid var(--border);
          transition: all 0.3s;
        }

        .timezone-item:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--shadow);
        }

        .timezone-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timezone-flag {
          font-size: 24px;
        }

        .timezone-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .timezone-time {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
          font-variant-numeric: tabular-nums;
        }

        .widget-menu {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          padding: 10px;
          background: var(--widget-bg);
          backdrop-filter: blur(30px);
          border-radius: 20px;
          box-shadow: 0 10px 40px var(--shadow);
          border: 1px solid var(--border);
          z-index: 100;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 14px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .menu-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--accent);
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
        }

        .menu-item:hover {
          color: white;
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(10, 132, 255, 0.3);
        }

        .menu-item:hover::before {
          opacity: 1;
        }

        .menu-item:active {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .widget {
            width: calc(100% - 40px) !important;
            left: 20px !important;
            max-width: 400px;
          }

          .widget-menu {
            flex-wrap: wrap;
            max-width: calc(100% - 40px);
            gap: 8px;
            padding: 8px;
          }

          .menu-item {
            flex: 1;
            justify-content: center;
            min-width: 100px;
            padding: 10px 14px;
            font-size: 13px;
          }

          .menu-item svg {
            width: 16px;
            height: 16px;
          }

          .clock {
            font-size: 12px;
          }

          .welcome-message h2 {
            font-size: 24px;
          }

          .pomodoro-timer {
            width: 180px;
            height: 180px;
          }

          .pomodoro-timer .time {
            font-size: 40px;
          }

          .temperature {
            font-size: 48px;
          }

          .weather-icon {
            font-size: 80px;
          }

          .calc-grid {
            gap: 8px;
          }

          .calc-btn {
            padding: 16px;
            font-size: 18px;
          }

          .calc-display {
            font-size: 28px;
            padding: 20px 14px;
          }

          .currency-selector {
            flex-direction: column;
          }

          .currency-arrow {
            transform: rotate(90deg);
            margin: 0;
          }

          .result-amount {
            font-size: 28px;
          }

          .timezone-time {
            font-size: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        button:focus-visible, 
        input:focus-visible, 
        textarea:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }

        @media (hover: none) {
          .widget-header {
            cursor: default;
          }
          
          .menu-item:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <BetterDesk />
    </AppProvider>
  );
}
