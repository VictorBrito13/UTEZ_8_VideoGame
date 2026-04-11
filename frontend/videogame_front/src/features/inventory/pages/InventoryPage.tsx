import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { BackButton } from "../../../common/ui/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Sparkles,
  Plus,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";

interface InventoryItem {
  id: number;
  quantity: number;
  object: {
    id: number;
    name: string;
    description: string;
    effect_type: string;
    effect_value: number;
    rarity: string;
    vfx_type: string;
    sprite?: string;
  };
}

export const InventoryPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useStatus, setUseStatus] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await apiClient.get("/api/inventory/");
        // Expecting response.data.results or response.data if it's the detail
        const invData = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        setItems(invData.items || []);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleUseItem = async (itemId: number) => {
    try {
      // Need a creature ID to use on. For now, we'll ask the user or pick the first from team
      console.log(`Preparing to use item ID: ${itemId}`);
      setUseStatus({
        msg: "Select a creature from 'My Collection' to apply this item.",
        type: "success",
      });
      setTimeout(() => setUseStatus(null), 4000);
    } catch (error) {
      setUseStatus({ msg: "Critical error using item.", type: "error" });
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY":
        return "text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.1)]";
      case "RARE":
        return "text-purple-400 border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]";
      case "UNCOMMON":
        return "text-blue-400 border-blue-500/50 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]";
      default:
        return "text-gray-400 border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <BackButton />
      <div className="p-6">
        <div className="w-full px-4 md:px-12">
          <div className="mb-12">
            <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
              STRATEGY_INVENTORY
            </h1>
            <p className="text-neutral-500 mt-2 font-medium">
              Consumables and tactical items for battle enhancement.
            </p>
          </div>

          <AnimatePresence>
            {useStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                  useStatus.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-red-500/10 border-red-500/50 text-red-400"
                }`}
              >
                <AlertCircle size={18} />
                <p className="font-bold">{useStatus.msg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-white/10 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-neutral-900 border border-white/5 rounded-2xl p-5 overflow-hidden transition-all hover:border-white/20 hover:bg-neutral-800/80"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`relative w-14 h-14 flex items-center justify-center rounded-xl bg-neutral-800 border ${getRarityColor(item.object.rarity)} transition-all group-hover:scale-110 group-hover:rotate-3`}
                    >
                      <AnimatePresence>
                        {item.object.sprite ? (
                          <motion.img
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{
                              y: [0, -4, 0],
                              transition: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              },
                            }}
                            src={item.object.sprite}
                            alt={item.object.name}
                            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                          />
                        ) : (
                          <Package size={24} className="opacity-50" />
                        )}
                      </AnimatePresence>
                      
                      {/* Inner Glow */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-2xl font-black italic text-neutral-700 group-hover:text-amber-500/20 transition-colors">
                        x{item.quantity}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`text-[10px] font-black uppercase mb-1 ${getRarityColor(item.object.rarity).split(" ")[0]}`}
                  >
                    {item.object.rarity}
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-amber-400 transition-colors">
                    {item.object.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mb-6 leading-relaxed h-8 line-clamp-2">
                    {item.object.description}
                  </p>

                  <div className="flex items-center justify-between gap-4 mt-auto">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 px-2 py-1 bg-white/5 rounded-md uppercase">
                      <Sparkles size={10} className="text-amber-500" />
                      {item.object.effect_type}
                    </div>
                    <button
                      onClick={() => handleUseItem(item.id)}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                    >
                      USE <Plus size={12} />
                    </button>
                  </div>

                  {/* Decorative Elements */}
                  <div
                    className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${getRarityColor(item.object.rarity).split(" ")[2]} opacity-0 group-hover:opacity-10 blur-3xl rounded-full transition-all duration-500 group-hover:scale-150`}
                  ></div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-24 bg-neutral-900/20 border border-dashed border-white/10 rounded-3xl">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 text-neutral-500">
                <ShoppingBag size={32} />
              </div>
              <p className="text-neutral-500 font-medium">
                Your inventory is empty.
                <br />
                Win battles to earn rewards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
