import React, { useState, useMemo, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileText, BarChart3, Table as TableIcon, Download, Search, RefreshCw, Users, Database, Calendar, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AtomicAnimation from './AtomicAnimation'
import { supabase } from './supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { calculateWorkingDuration, formatDuration as formatDur } from './utils/timeUtils'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement)
