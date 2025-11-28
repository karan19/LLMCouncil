import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Crown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export default function Stage3({ stage3 }) {
  if (!stage3 || !stage3.content) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No synthesis available
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-amber-900">
                  Chairman's Synthesis
                </CardTitle>
                <p className="text-xs text-amber-700">
                  Final consolidated response
                </p>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              <Sparkles className="w-3 h-3 mr-1" />
              Final Answer
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="markdown-content text-amber-950">
            <ReactMarkdown>{stage3.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
