import logging
import uuid
import re

logger = logging.getLogger("ChromaManager")

# Define fallback database for equations
SEED_EQUATIONS = [
    {
        "equation": "a^2 + b^2 = c^2",
        "category": "Geometry",
        "explanation": "Pythagorean theorem representing the relationship between side lengths of a right triangle.",
        "tags": ["pythagorean", "triangle", "hypotenuse", "right angle", "geometry"]
    },
    {
        "equation": "\\sin^2(x) + \\cos^2(x) = 1",
        "category": "Trigonometry",
        "explanation": "Fundamental trigonometric identity stating that the sum of the squares of sine and cosine is always one.",
        "tags": ["sine", "cosine", "trig", "identity", "pythagorean identity"]
    },
    {
        "equation": "e^{i\\pi} + 1 = 0",
        "category": "Complex Analysis",
        "explanation": "Euler's identity linking geometry, analysis, algebra, and complex numbers in one elegant equation.",
        "tags": ["euler", "identity", "imaginary", "complex analysis", "transcendental"]
    },
    {
        "equation": "E = m c^2",
        "category": "Relativistic Physics",
        "explanation": "Einstein's mass-energy equivalence equation showing that mass and energy are directly proportional.",
        "tags": ["einstein", "relativity", "energy", "mass", "speed of light"]
    },
    {
        "equation": "f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}",
        "category": "Probability & Statistics",
        "explanation": "Probability density function of the normal (Gaussian) distribution, mapping a standard symmetric bell curve.",
        "tags": ["gaussian", "normal distribution", "bell curve", "mean", "variance"]
    },
    {
        "equation": "\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx",
        "category": "Harmonic Analysis",
        "explanation": "Fourier Transform decomposing a continuous signal or mathematical function into its frequency components.",
        "tags": ["fourier", "transform", "frequency", "signal", "waves"]
    },
    {
        "equation": "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}",
        "category": "Electrodynamics",
        "explanation": "Gauss's law stating that the net electric flux through any closed surface is proportional to the enclosed charge.",
        "tags": ["maxwell", "gauss", "electric field", "charge", "flux"]
    },
    {
        "equation": "i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)",
        "category": "Quantum Mechanics",
        "explanation": "Time-dependent Schrödinger equation describing the temporal development of a quantum state wave function.",
        "tags": ["schrodinger", "wave function", "quantum mechanics", "state", "hamiltonian"]
    },
    {
        "equation": "\\int_{a}^{b} f(x) dx = F(b) - F(a)",
        "category": "Calculus",
        "explanation": "The Fundamental Theorem of Calculus linking differentiation and integration operations.",
        "tags": ["calculus", "integral", "derivative", "fundamental theorem", "area"]
    },
    {
        "equation": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
        "category": "Algebra",
        "explanation": "The quadratic formula providing the roots of a standard quadratic polynomial equation.",
        "tags": ["quadratic", "algebra", "roots", "roots solver", "discriminant"]
    },
    {
        "equation": "A = \\pi r^2",
        "category": "Geometry",
        "explanation": "Formula to calculate the area of a circle given its radius r.",
        "tags": ["circle", "area", "radius", "geometry", "pi"]
    }
]

UNICODE_TO_LATEX = {
    "π": "pi",
    "θ": "theta",
    "α": "alpha",
    "β": "beta",
    "γ": "gamma",
    "δ": "delta",
    "ε": "epsilon",
    "σ": "sigma",
    "μ": "mu",
    "∞": "infty",
    "∫": "int",
    "∂": "partial",
    "∇": "nabla",
    "±": "pm",
}

def clean_latex(s: str) -> str:
    s = s.lower()
    # Normalize unicode symbols
    for uni, lat in UNICODE_TO_LATEX.items():
        s = s.replace(uni, lat)
    # Remove spaces, backslashes, braces, double/single dollars, and formatting
    s = s.replace(" ", "").replace("\\", "").replace("{", "").replace("}", "").replace("^", "").replace("_", "")
    s = s.replace("$$", "").replace("$", "").replace("[", "").replace("]", "")
    s = s.replace("displaystyle", "").replace("displaylines", "")
    return s

def calculate_jaccard_similarity(s1: str, s2: str) -> float:
    set1 = set(clean_latex(s1))
    set2 = set(clean_latex(s2))
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

def calculate_exact_match(q: str, db_eq: str) -> float:
    c_q = clean_latex(q)
    c_db = clean_latex(db_eq)
    
    # 1. Exact direct match
    if c_q == c_db:
        return 1.0
        
    # 2. Structural match (variable swapping like a^2+b^2=c^2 vs x^2+y^2=z^2)
    # Replace individual single letter variables with 'v'
    v_q = re.sub(r'[a-zA-Z]', 'v', c_q)
    v_db = re.sub(r'[a-zA-Z]', 'v', c_db)
    if v_q == v_db:
        return 0.96
        
    return 0.0

class ChromaManager:
    def __init__(self):
        self.use_chromadb = False
        self.client = None
        self.collection = None
        self.model = None

        # Attempt to initialize ChromaDB and SentenceTransformers
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            
            logger.info("Initializing SentenceTransformers and ChromaDB...")
            # We use an in-memory Chroma client for lightweight execution
            self.client = chromadb.Client()
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            
            self.collection = self.client.get_or_create_collection(
                name="equations_collection"
            )
            
            # Check if collection is empty, and seed it
            if self.collection.count() == 0:
                self._seed_chroma_db()
                
            self.use_chromadb = True
            logger.info("Successfully initialized ChromaDB Vector Database.")
        except Exception as e:
            logger.warning(
                f"Could not load chromadb or sentence_transformers. "
                f"Error: {str(e)}. Falling back to local vector simulation engine."
            )
            self.use_chromadb = False

    def _seed_chroma_db(self):
        documents = []
        metadatas = []
        ids = []
        embeddings = []

        for eq in SEED_EQUATIONS:
            # Document text represents queryable words
            doc_text = f"{eq['equation']} {eq['category']} {eq['explanation']} {' '.join(eq['tags'])}"
            documents.append(doc_text)
            metadatas.append({
                "equation": eq["equation"],
                "category": eq["category"],
                "explanation": eq["explanation"]
            })
            ids.append(str(uuid.uuid4()))
            
        embeddings = self.model.encode(documents).tolist()
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Seeded ChromaDB with {len(SEED_EQUATIONS)} math equations.")

    def search(self, query: str, limit: int = 5):
        # Calculate hybrid matching scores for all equations in SEED_EQUATIONS
        query_words = set(re.findall(r'\w+', query.lower()))
        
        scored_seed = []
        for eq in SEED_EQUATIONS:
            exact_score = calculate_exact_match(query, eq["equation"])
            jaccard_sim = calculate_jaccard_similarity(query, eq["equation"])
            jaccard_score = int(jaccard_sim * 100)
            
            keyword_score = 0
            category_words = set(re.findall(r'\w+', eq["category"].lower()))
            if query.lower() == eq["category"].lower():
                keyword_score += 40
            elif query_words & category_words:
                keyword_score += 20
                
            for word in query_words:
                # For single-character words, be very strict
                if len(word) == 1:
                    # Match exact variable occurrences in the equation code
                    if re.search(r'\b' + re.escape(word) + r'\b', eq["equation"].lower()):
                        keyword_score += 15
                else:
                    if word in eq["equation"].lower():
                        keyword_score += 15
                    if word in eq["explanation"].lower():
                        keyword_score += 5
                    
                # Match tags exactly
                if word in eq["tags"]:
                    keyword_score += 15
                    
            keyword_sim = min(95, 45 + keyword_score) if keyword_score > 0 else 0
            
            final_similarity = 0
            if exact_score > 0:
                final_similarity = int(exact_score * 100)
            else:
                if jaccard_score > 40:
                    # Blend Jaccard character overlaps and context keywords
                    final_similarity = int(jaccard_score * 0.75 + keyword_sim * 0.25)
                else:
                    final_similarity = int(keyword_sim)
                    
            if final_similarity > 0:
                if exact_score == 1.0:
                    final_similarity = 100
                else:
                    final_similarity = min(99, max(45, final_similarity))
                scored_seed.append((eq, final_similarity))

        # Perform semantic Chroma search if enabled
        chroma_results = []
        if self.use_chromadb:
            try:
                query_vector = self.model.encode([query]).tolist()
                results = self.collection.query(
                    query_embeddings=query_vector,
                    n_results=limit
                )
                
                if results and "metadatas" in results and len(results["metadatas"]) > 0:
                    for i in range(len(results["ids"][0])):
                        meta = results["metadatas"][0][i]
                        dist = results["distances"][0][i] if "distances" in results else 0.5
                        similarity = int(max(40, min(99, (1.0 - (dist / 2.0)) * 100)))
                        
                        chroma_results.append({
                            "equation": meta["equation"],
                            "category": meta["category"],
                            "similarity_score": similarity,
                            "explanation": meta["explanation"]
                        })
            except Exception as search_err:
                logger.error(f"ChromaDB search query failed: {str(search_err)}")

        # Merge results, prioritizing high-certainty structural exact matches
        merged_results = {}
        
        # 1. Fill with hybrid keyword/Jaccard scored candidates
        for eq, sim in scored_seed:
            merged_results[eq["equation"]] = {
                "equation": eq["equation"],
                "category": eq["category"],
                "similarity_score": sim,
                "explanation": eq["explanation"]
            }
            
        # 2. Overlay Chroma DB vector search entries
        for cr in chroma_results:
            eq_text = cr["equation"]
            if eq_text in merged_results:
                # Keep the maximum similarity score between the two methods
                merged_results[eq_text]["similarity_score"] = max(
                    merged_results[eq_text]["similarity_score"],
                    cr["similarity_score"]
                )
            else:
                merged_results[eq_text] = cr
                
        # Filter out matches that don't satisfy our minimum threshold
        final_list = [v for v in merged_results.values() if v["similarity_score"] >= 45]
        
        # Sort list descending by score and return top results
        sorted_results = sorted(final_list, key=lambda x: x["similarity_score"], reverse=True)
        return sorted_results[:limit]

    def add_equation(self, equation: str, category: str, explanation: str, tags: list = None):
        if not tags:
            tags = []
        # Add to local SEED_EQUATIONS for memory fallback
        new_eq = {
            "equation": equation,
            "category": category,
            "explanation": explanation,
            "tags": tags
        }
        # Avoid duplicate additions
        if not any(clean_latex(e["equation"]) == clean_latex(equation) for e in SEED_EQUATIONS):
            SEED_EQUATIONS.append(new_eq)
            
            # If Chroma DB is enabled, add it to vector collection
            if self.use_chromadb and self.collection:
                try:
                    doc_text = f"{equation} {category} {explanation} {' '.join(tags)}"
                    doc_id = str(uuid.uuid4())
                    query_vector = self.model.encode([doc_text]).tolist()
                    self.collection.add(
                        embeddings=query_vector,
                        documents=[doc_text],
                        metadatas=[{
                            "equation": equation,
                            "category": category,
                            "explanation": explanation
                        }],
                        ids=[doc_id]
                    )
                    logger.info(f"Dynamically indexed new equation into ChromaDB: {equation}")
                except Exception as add_err:
                    logger.error(f"Failed to add dynamic equation to ChromaDB: {str(add_err)}")

# Singleton instance
chroma_manager = ChromaManager()
