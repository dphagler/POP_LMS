"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Container,
  Flex,
  Heading,
  Icon,
  List,
  ListIcon,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
  chakra,
  useColorModeValue
} from "@chakra-ui/react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Target,
  Users
} from "lucide-react";

import { PageFadeIn } from "@/components/layout/page-fade-in";
import { SIGN_OUT_TOAST_STORAGE_KEY } from "@/lib/storage-keys";

const heroHighlights = [
  "Launch sequenced essential-skill pathways in minutes—no new staff required.",
  "Automated nudges, leaderboards, and streaks keep classrooms engaged every day.",
  "District dashboards tie participation to career readiness benchmarks you can report on.",
];

const heroStats = [
  { value: "28", label: "Active cohorts nationwide" },
  { value: "94%", label: "Average completion rate" },
  { value: "8.7/10", label: "Learner satisfaction" },
  { value: "120+", label: "Micro-lessons ready to launch" },
];

const features = [
  {
    icon: Sparkles,
    title: "Micro-learning videos",
    description:
      "Short, cinematic lessons make it easy for students to learn essential professional habits.",
  },
  {
    icon: Target,
    title: "Personalized nudges",
    description:
      "Automated reminders and streaks keep every learner on pace without additional staff time.",
  },
  {
    icon: BarChart3,
    title: "Growth dashboards",
    description:
      "Real-time insights show teachers exactly how cohorts are progressing week over week.",
  },
  {
    icon: GraduationCap,
    title: "Interview practice",
    description:
      "Guided prompts help learners rehearse answers and build confidence before the big day.",
  },
];

const stakeholders = [
  {
    icon: Users,
    title: "District leaders",
    description: "Unlock clear ROI with dashboards showcasing readiness gains across every campus.",
  },
  {
    icon: Sparkles,
    title: "Teachers & coaches",
    description: "Launch curated playlists in minutes and monitor classroom engagement at a glance.",
  },
  {
    icon: GraduationCap,
    title: "Students",
    description: "Earn micro-credentials, build interview confidence, and bring positivity into every team.",
  },
];

const ctaHighlights = [
  "Preview district-ready lesson pathways",
  "Tour analytics & reporting",
  "Plan rollout with our team",
];

type SignedOutToastProps = {
  message: string | null;
  onDismiss: () => void;
};

function SignedOutToast({ message, onDismiss }: SignedOutToastProps) {
  if (!message) return null;

  return (
    <Alert
      status="success"
      variant="solid"
      position="fixed"
      top={6}
      left="50%"
      transform="translateX(-50%)"
      borderRadius="full"
      px={6}
      py={3}
      zIndex={1400}
      shadow="lg"
    >
      <AlertIcon />
      <AlertDescription display="flex" alignItems="center" gap={4}>
        <Text fontWeight="semibold">{message}</Text>
        <Button size="sm" onClick={onDismiss} variant="outline" colorScheme="whiteAlpha">
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function Section({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <Box as="section" id={id} py={{ base: 16, md: 24 }}>
      {children}
    </Box>
  );
}

export default function MarketingPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const gradientTop = useColorModeValue("primary.50", "primary.900");
  const gradientBottom = useColorModeValue("white", "gray.900");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMessage = sessionStorage.getItem(SIGN_OUT_TOAST_STORAGE_KEY);
    if (storedMessage) {
      setToastMessage(storedMessage);
      sessionStorage.removeItem(SIGN_OUT_TOAST_STORAGE_KEY);
    }
  }, []);

  return (
    <PageFadeIn className="min-h-screen" role="main">
      <SignedOutToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <Box
        bgGradient={`linear(to-b, ${gradientTop}, ${gradientBottom})`}
        pt={{ base: 12, md: 20 }}
        pb={{ base: 16, md: 24 }}
      >
        <Container maxW="6xl">
          <Flex justify="space-between" align="center" mb={{ base: 12, md: 16 }}>
            <Stack spacing={1}>
              <Text fontSize="sm" fontWeight="semibold" color="fg.muted" letterSpacing="0.2em" textTransform="uppercase">
                POP Initiative
              </Text>
              <Heading size="lg">Career readiness reimagined</Heading>
            </Stack>
            <Button as={Link} href="/signin" colorScheme="primary" size="sm">
              Sign in
            </Button>
          </Flex>

          <Section>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 12, lg: 16 }} alignItems="center">
              <Stack spacing={8}>
                <Stack spacing={4}>
                  <chakra.span
                    color="primary.500"
                    fontWeight="semibold"
                    textTransform="uppercase"
                    letterSpacing="0.25em"
                  >
                    Empower every learner
                  </chakra.span>
                  <Heading as="h1" size="2xl" lineHeight="shorter">
                    Real-world professional skills for the classroom and beyond
                  </Heading>
                  <Text fontSize={{ base: "lg", md: "xl" }} color="fg.muted">
                    POP Initiative weaves short-form video, gamification, and coaching insights into a daily practice that keeps
                    students progressing together.
                  </Text>
                </Stack>
                <Stack spacing={6}>
                  <Stack spacing={3}>
                    {heroHighlights.map((highlight) => (
                      <Flex key={highlight} align="flex-start" gap={3}>
                        <Icon as={CheckCircle2} color="primary.500" boxSize={5} mt={1} />
                        <Text fontSize="md" color="fg.muted">
                          {highlight}
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                  <Flex flexWrap="wrap" gap={4}>
                    <Button as={Link} href="/signup" colorScheme="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                      Book a demo
                    </Button>
                    <Button as={Link} href="/app" variant="outline" size="lg">
                      Explore the platform
                    </Button>
                  </Flex>
                </Stack>
              </Stack>

              <Card variant="elevated" borderRadius="2xl" shadow="2xl" bg="whiteAlpha.900" _dark={{ bg: "gray.800" }}>
                <CardHeader borderBottomWidth="1px" borderColor="border.subtle">
                  <Stack spacing={2}>
                    <Text fontSize="sm" color="fg.muted" textTransform="uppercase" letterSpacing="0.2em">
                      Why schools choose POP
                    </Text>
                    <Heading size="md">Measurable momentum every week</Heading>
                  </Stack>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 2, sm: 2 }} spacing={6}>
                    {heroStats.map((stat) => (
                      <Stack key={stat.label} spacing={1}>
                        <Heading size="xl" color="primary.500">
                          {stat.value}
                        </Heading>
                        <Text fontSize="sm" color="fg.muted">
                          {stat.label}
                        </Text>
                      </Stack>
                    ))}
                  </SimpleGrid>
                </CardBody>
                <CardFooter>
                  <Text fontSize="sm" color="fg.muted">
                    Launch with curated pathways, then tailor playlists to your district in minutes.
                  </Text>
                </CardFooter>
              </Card>
            </SimpleGrid>
          </Section>

          <Section id="features">
            <Stack spacing={12} textAlign="center">
              <Stack spacing={4} maxW="2xl" mx="auto">
                <Heading size="lg">Everything you need to run a joyful skills program</Heading>
                <Text fontSize="lg" color="fg.muted">
                  Four pillars keep momentum high for students and visibility clear for educators.
                </Text>
              </Stack>

              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={6}>
                {features.map((feature) => (
                  <Card key={feature.title} borderRadius="2xl" p={1}>
                    <CardBody>
                      <Stack spacing={4} align="flex-start">
                        <Flex
                          align="center"
                          justify="center"
                          boxSize={12}
                          borderRadius="full"
                          bg="primary.50"
                          color="primary.500"
                          _dark={{ bg: "primary.900", color: "primary.200" }}
                        >
                          <Icon as={feature.icon} boxSize={6} />
                        </Flex>
                        <Stack spacing={2} align="flex-start">
                          <Heading size="sm">{feature.title}</Heading>
                          <Text fontSize="sm" color="fg.muted">
                            {feature.description}
                          </Text>
                        </Stack>
                      </Stack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Section>

          <Section id="who">
            <Stack spacing={12}>
              <Stack spacing={4} maxW="2xl">
                <Heading size="lg">Built for every stakeholder</Heading>
                <Text fontSize="lg" color="fg.muted">
                  POP brings learners, teachers, and leaders together with aligned incentives and simple workflows.
                </Text>
              </Stack>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {stakeholders.map((stakeholder) => (
                  <Card key={stakeholder.title} borderRadius="2xl" h="full">
                    <CardBody>
                      <Stack spacing={4}>
                        <Flex
                          align="center"
                          justify="center"
                          boxSize={12}
                          borderRadius="full"
                          bg="primary.50"
                          color="primary.500"
                          _dark={{ bg: "primary.900", color: "primary.200" }}
                        >
                          <Icon as={stakeholder.icon} boxSize={6} />
                        </Flex>
                        <Heading size="sm">{stakeholder.title}</Heading>
                        <Text fontSize="sm" color="fg.muted">
                          {stakeholder.description}
                        </Text>
                      </Stack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Section>

          <Section>
            <Card
              borderRadius="3xl"
              py={{ base: 10, md: 12 }}
              px={{ base: 8, md: 16 }}
              bgGradient="linear(to-r, primary.500, primary.700)"
              color="white"
              shadow="xl"
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 8, md: 16 }} alignItems="center">
                <Stack spacing={4}>
                  <Heading size="lg">See POP Initiative in action</Heading>
                  <Text fontSize="md" color="whiteAlpha.900">
                    Partner with our team for a guided rollout. Explore pathways, dashboards, and group workflows in a live tour.
                  </Text>
                </Stack>
                <Stack spacing={6}>
                  <List spacing={3} fontSize="sm" color="whiteAlpha.900">
                    {ctaHighlights.map((item) => (
                      <ListItem key={item} display="flex" alignItems="center" gap={3}>
                        <ListIcon as={CheckCircle2} color="white" />
                        {item}
                      </ListItem>
                    ))}
                  </List>
                  <Flex gap={4} wrap="wrap">
                    <Button
                      as={Link}
                      href="/signup"
                      colorScheme="blackAlpha"
                      bg="white"
                      color="primary.600"
                      _hover={{ bg: "whiteAlpha.900" }}
                    >
                      Schedule demo
                    </Button>
                    <Button as={Link} href="/contact" variant="outline" colorScheme="whiteAlpha">
                      Contact us
                    </Button>
                  </Flex>
                </Stack>
              </SimpleGrid>
            </Card>
          </Section>
        </Container>
      </Box>
    </PageFadeIn>
  );
}
