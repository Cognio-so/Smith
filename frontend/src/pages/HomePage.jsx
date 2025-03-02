import React from 'react'
import { Mic, ChevronRight, Zap, Cpu, Sliders, Play, Brain, Globe, Facebook, Twitter, Instagram, Linkedin, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar'
import { motion } from 'framer-motion'

const modelCards = [
  {
    name: "OpenAI",
    description: "The foundation model by OpenAI. Good for most general tasks",
    features: ["GPT-4 Turbo", "GPT-4", "GPT-3.5 Turbo", "DALL-E 3"],
  },
  {
    name: "Anthropic",
    description: "Anthropic's fastest and lightest model",
    features: ["Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku", "Claude 2.1"],
  },
  {
    name: "DeepSeek",
    description: "An updated, distilled version of Meta's 405B flagship model",
    features: ["DeepSeek Coder 33B", "DeepSeek Code 7B", "DeepSeek LLM 67B", "DeepSeek MoE"],
  },
  {
    name: "Google",
    description: "Google's lightweight counterpart to their flagship model. Great performance for its size",
    features: ["Gemini Ultra", "Gemini Pro", "Gemini Nano", "PaLM 2"],
  },
];

const features = [
  {
    icon: <Zap className="w-8 h-8 text-purple-500" />,
    title: "Hands-Free Efficiency",
    description: "Boost productivity with voice commands",
  },
  {
    icon: <Mic className="w-8 h-8 text-purple-500" />,
    title: "Personalized Experience",
    description: "AI learns and adapts to your preferences",
  },
  {
    icon: <Cpu className="w-8 h-8 text-purple-500" />,
    title: "Future-Ready Technology",
    description: "Stay ahead with cutting-edge AI",
  },
]
const steps = [
  {
    icon: <Play className="w-8 h-8 text-purple-500" />,
    title: "Sign Up and Set Up",
    description: "Create your account and configure preferences",
  },
  {
    icon: <Sliders className="w-8 h-8 text-purple-500" />,
    title: "Customize Your Experience",
    description: "Tailor the AI to your specific needs",
  },
  {
    icon: <Mic className="w-8 h-8 text-purple-500" />,
    title: "Start Using Voice Commands",
    description: "Enjoy hands-free control of your devices",
  },
]

const Keyfeatures = [
  {
    icon: <Mic className="w-8 h-8 text-purple-500" />,
    title: "Advanced Speech Recognition",
    description: "Highly accurate voice-to-text conversion in multiple languages",
  },
  {
    icon: <Brain className="w-8 h-8 text-purple-500" />,
    title: "Natural Language Processing",
    description: "Understand context and intent for more natural interactions",
  },
  {
    icon: <Globe className="w-8 h-8 text-purple-500" />,
    title: "Cross-Platform Compatibility",
    description: "Seamless integration with various devices and operating systems",
  },
]
const HomePage = () => {
  return (
    <div className='min-h-screen bg-custom-gradient text-white relative overflow-hidden'>
      <Navbar className="z-50 relative" />
      <main className="container mx-auto px-4 py-20 text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold mb-8"
        >
          Change the World <br />with Voice AI!
        </motion.h1>
        <div className="flex justify-center space-x-4 mb-20">
          <button className="glossy-button bg-dark-button hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-full">Try for free</button>
          <button className="glossy-button-outline bg-transparent border border-white hover:bg-white hover:text-purple-700 text-white font-bold py-3 px-6 rounded-full inline-flex items-center">Learn More
            <ChevronRight className="ml-2 h-5 w-5" />
          </button>
        </div>

        <div className="audio-wave-container absolute bottom-0 left-0 right-0">
          <div className="audio-wave"></div>
        </div>

        <div className="absolute left-1/2 bottom-40 transform -translate-x-1/2">
          <div className="mic-container">
            <div className="mic-circle-outer"></div>
            <div className="mic-circle-middle"></div>
            <div className="mic-circle-inner">
              <Mic className='h-10 w-10 text-white' />
            </div>
          </div>
        </div>
      </main>
      {/* About Vaani-Pro Section - Fixed layout */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              About Vaani-Pro
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Transform your interaction with technology using advanced Voice AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden"
            >
              <img
                src="/image-1.png"
                alt="Vaani-Pro Voice AI"
                className="w-full h-auto object-cover rounded-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center p-6"
            >
              <h3 className="text-3xl font-bold mb-4">
                Revolutionary Voice AI
              </h3>
              <p className="text-gray-300 text-lg mb-6">
                Vaani-Pro is a revolutionary Voice AI platform that transforms the way we interact with technology. Our
                cutting-edge solution leverages advanced natural language processing and machine learning algorithms to
                create seamless voice-controlled experiences.
              </p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  Advanced speech recognition technology
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  Natural language understanding
                </li>
                <li className="flex items-center text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  Cross-platform integration
                </li>
              </ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="glossy-button bg-dark-button hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-full inline-flex items-center self-start"
              >
                Learn More About Us
                <ChevronRight className="ml-2 h-5 w-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Replace the Trusted Partners section with ModelsName */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              AI Companies & Models
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Access models from leading AI companies through our unified platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {modelCards.map((model, index) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative p-6 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/20 
                  hover:bg-white/[0.05] transition-all duration-300 
                  shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] 
                  overflow-hidden
                  hover:border-white/40"
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative z-10">
                  <h3 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                    {model.name}
                  </h3>
                  <p className="text-gray-400 mb-6">{model.description}</p>
                  <ul className="space-y-2">
                    {model.features.map((feature) => (
                      <motion.li
                        key={feature}
                        className="text-gray-500 flex items-center gap-2"
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          whileHover={{ scale: 1.5 }}
                        />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Voice Controlled AI Section */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Why Choose Voice Controlled AI?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience the next generation of voice interaction technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative p-6 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/20 
                  hover:bg-white/[0.05] transition-all duration-300 
                  shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] 
                  overflow-hidden
                  hover:border-white/40"
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative z-10">
                  <div className="mb-4 flex justify-center">
                    <div className="w-8 h-8 text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 justify-center">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How Its Works */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Get started with Vaani-Pro in just a few simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative p-6 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/20 
                  hover:bg-white/[0.05] transition-all duration-300 
                  shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] 
                  overflow-hidden
                  hover:border-white/40"
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative z-10">
                  <div className="mb-4 flex justify-center">
                    <div className="w-8 h-8 text-primary">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 justify-center">
                    {step.title}
                  </h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Key Features Of Vaani-Pro
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Discover the powerful features that set us apart
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Keyfeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative p-6 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/20 
                  hover:bg-white/[0.05] transition-all duration-300 
                  shadow-[0_0_20px_rgba(204,43,94,0.3)] hover:shadow-[0_0_30px_rgba(204,43,94,0.5)] 
                  overflow-hidden
                  hover:border-white/40"
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative z-10">
                  <div className="mb-4 flex justify-center">
                    <div className="w-8 h-8 text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4 flex items-center gap-2 justify-center">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Start Today */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="group relative rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center max-w-4xl mx-auto
            shadow-[0_0_30px_rgba(204,43,94,0.4)] hover:shadow-[0_0_40px_rgba(204,43,94,0.6)] 
            overflow-hidden"
          whileHover={{
            scale: 1.01,
            transition: { duration: 0.2 }
          }}
        >
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
            <p className="text-xl mb-8">
              Experience the power of Voice AI and transform the way you interact with technology
            </p>
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='px-8 py-3 bg-white text-purple-600 rounded-full font-bold shadow-lg'
              >
                Get Started for Free
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='px-8 py-3 bg-transparent border-2 border-white text-white rounded-full font-bold hover:bg-white hover:text-purple-600 shadow-lg'
              >
                Explore Features
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
      {/* Footer */}
      <footer className='bg-[#0a0a0a] py-12'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container mx-auto px-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className='flex items-center mb-4'>
                <img src="/vannipro.png" alt="vaanipro" className='w-16 h-12' />
                <span className="ml-2 text-2xl font-bold">Vaani.pro</span>
              </div>
              <p className="text-gray-300">Transforming the world with Voice AI technology</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className='text-lg font-semibold mb-4'>Features</h3>
              <ul className="space-y-2 text-gray-300">
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Speech Recognition
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Natural Language Processing
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Cross-Platform Compatibility
                </motion.li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-300">
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  About Us
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Privacy Policy
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Contact us
                </motion.li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold mb-4">Get Started</h3>
              <ul className="space-y-2 text-gray-300">
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Documentation
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  API Reference
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className='hover:text-white cursor-pointer'>
                  Support
                </motion.li>
              </ul>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8"
          >
            <div className="flex space-x-4 mb-4 md:mb-0">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon size={24} className="cursor-pointer" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center text-gray-400 mt-8"
        >
          © 2025 Vaani-Pro. All rights reserved
        </motion.div>
      </footer>
    </div>
  )
}

export default HomePage