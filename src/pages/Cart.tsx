import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Cart = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCheckout = async () => {
    try {
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to checkout",
        });
        navigate('/login');
        return;
      }
      
      // First, get user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Could not fetch profile data');
      }

      if (!profileData?.full_name || !profileData?.phone || !profileData?.address) {
        toast({
          variant: "destructive",
          title: "Profile Incomplete",
          description: "Please complete your profile before placing an order",
        });
        navigate('/profile');
        return;
      }

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          status: 'pending',
          customer_name: profileData.full_name,
          customer_phone: profileData.phone,
          customer_address: profileData.address
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order error:', orderError);
        throw new Error('Failed to create order');
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
        throw new Error('Failed to create order items');
      }

      clearCart();
      toast({
        title: "Order placed successfully",
        description: "Your order has been placed and is being processed.",
      });
      navigate('/orders');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        variant: "destructive",
        title: "Error placing order",
        description: error.message || 'An error occurred while placing your order',
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/')}>Browse Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
            <div className="flex items-center space-x-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold">Total:</span>
          <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={clearCart}>
            Clear Cart
          </Button>
          <Button onClick={handleCheckout}>
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;