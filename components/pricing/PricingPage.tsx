import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { getProducts, createCheckoutSession } from '../../services/subscriptionService';
import Spinner from '../ui/Spinner';
import OfficialLogo from '../dashboard/OfficialLogo';

interface PricingPageProps {
  onSubscriptionSuccess: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onSubscriptionSuccess }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);
  
  // Check for successful subscription redirect from Stripe
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('subscription_success')) {
      onSubscriptionSuccess();
    }
  }, [onSubscriptionSuccess]);

  const handleSubscribe = async (priceId: string) => {
    setCheckoutLoading(priceId);
    setError(null);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (err: any) {
      setError(err.message);
      setCheckoutLoading(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Spinner size="lg" text="Loading plans..." />;
    }

    if (error && !products.length) {
      return (
        <div className="text-center text-red-600">
          <p>Error loading subscription plans.</p>
          <p>{error}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product, index) => (
          <div key={product.tier_name} className={`border rounded-xl p-6 flex flex-col shadow-lg animate-slide-in-up`} style={{animationDelay: `${index * 100}ms`}}>
            <h3 className="text-lg font-bold text-primary">{product.name}</h3>
            <p className="text-sm text-gray-500 mt-1 flex-grow">{product.description}</p>
            <div className="mt-6">
                <button
                onClick={() => handleSubscribe(product.stripe_price_id)}
                disabled={!!checkoutLoading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                {checkoutLoading === product.stripe_price_id ? <Spinner size="sm" /> : 'Choose Plan'}
                </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
            <div className="text-center mb-12">
                <OfficialLogo className="w-20 h-20 mx-auto mb-4" />
                <h1 className="text-4xl font-extrabold text-primary sm:text-5xl">
                    Choose the Right Plan for Your Business
                </h1>
                <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                    From essential insights to strategic forecasting, VFIN provides the financial intelligence you need to grow.
                </p>
            </div>

            {renderContent()}

            {error && (
                <div className="mt-8 text-center text-sm font-medium text-red-600 bg-red-100 p-3 rounded-md max-w-xl mx-auto">
                    {error}
                </div>
            )}
        </div>
    </div>
  );
};

export default PricingPage;
