package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const ENTRY_POINT = "M:\\MediaLib\\Application\\vids"

// const ENTRY_POINT = "B:\\CineFinn-data\\vids"

type Output struct {
	Files  []string `json:"files"`
	Dirs   []string `json:"dirs"`
	Errors []error  `json:"errors"`
}

func walkSync() {
	output := Output{}
	filepath.WalkDir(ENTRY_POINT, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			output.Errors = append(output.Errors, err)
			return err
		}
		fullPath := filepath.Join(path, d.Name())
		fmt.Println(fullPath)
		output.Files = append(output.Files, fullPath)
		if d.IsDir() {
			output.Dirs = append(output.Dirs, fullPath)
		}
		return nil
	})

	str, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		fmt.Println(err)
		return
	}
	// fmt.Println(output)
	fmt.Println(string(str))
}

const (
	WarmupRuns  = 4
	SampleRuns  = 15
	Concurrency = 32 // Limit concurrent dir reads to prevent OS file handle limits
)

type BenchmarkStats struct {
	Name      string
	Durations []time.Duration
	Mean      time.Duration
	Median    time.Duration
	P90       time.Duration
	P95       time.Duration
	P99       time.Duration
	Min       time.Duration
	Max       time.Duration
}

// -----------------------------------------------------------------------------
// Method 1: Sequential filepath.WalkDir
// -----------------------------------------------------------------------------
func walkSequential(root string) (Output, error) {
	output := Output{}
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			output.Errors = append(output.Errors, err)
			return nil
		}
		fullPath := filepath.Join(path, d.Name())
		output.Files = append(output.Files, fullPath)
		if d.IsDir() {
			output.Dirs = append(output.Dirs, fullPath)
		}
		return nil
	})
	return output, err
}

// -----------------------------------------------------------------------------
// Method 2: Concurrent (Goroutines + Channels + WaitGroup + Semaphore)
// -----------------------------------------------------------------------------
var sem = make(chan struct{}, Concurrency)

func walkConcurrent(dir string, aggregateChan chan<- SmallOutput, wg *sync.WaitGroup) {
	defer wg.Done()

	sem <- struct{}{}
	entries, err := os.ReadDir(dir)
	<-sem

	smallOutput := SmallOutput{}
	if err != nil {
		smallOutput.Errors = append(smallOutput.Errors, err)
		aggregateChan <- smallOutput
		return
	}

	for _, d := range entries {
		fullPath := filepath.Join(dir, d.Name())
		smallOutput.Files = append(smallOutput.Files, fullPath)
		if d.IsDir() {
			smallOutput.Dirs = append(smallOutput.Dirs, fullPath)
		}

		aggregateChan <- smallOutput

		if d.IsDir() {
			wg.Add(1)
			path := filepath.Join(dir, d.Name())
			go walkConcurrent(path, aggregateChan, wg)
		}
	}

}

type SmallOutput struct {
	Files  []string `json:"files"`
	Dirs   []string `json:"dirs"`
	Errors []error  `json:"errors"`
}

func runConcurrent(root string) Output {
	aggregateChan := make(chan SmallOutput, 1000)
	var wg sync.WaitGroup

	output := Output{}
	done := make(chan struct{})

	// Aggregator goroutine
	go func() {
		for aggregate := range aggregateChan {
			output.Files = append(output.Files, aggregate.Files...)
			output.Dirs = append(output.Dirs, aggregate.Dirs...)
			output.Errors = append(output.Errors, aggregate.Errors...)
		}

		close(done)
	}()

	wg.Add(1)
	go walkConcurrent(root, aggregateChan, &wg)

	wg.Wait()
	close(aggregateChan)
	<-done

	return output
}

func runBenchmark(name string, runner func() Output) BenchmarkStats {
	fmt.Printf("--- Running %s ---\n", name)

	// Warm-up runs (discarded)
	for i := 1; i <= WarmupRuns; i++ {
		start := time.Now()
		output := runner()
		fmt.Printf("  [Warm-up %d/%d] Scanned %d items in %v\n", i, WarmupRuns, len(output.Files), time.Since(start))
	}

	// Sample runs
	durations := make([]time.Duration, 0, SampleRuns)
	for i := 1; i <= SampleRuns; i++ {
		start := time.Now()
		_ = runner()
		elapsed := time.Since(start)
		durations = append(durations, elapsed)
		fmt.Printf("  [Sample %2d/%d] %v\n", i, SampleRuns, elapsed)
	}

	return calculateStats(name, durations)
}

func calculateStats(name string, durations []time.Duration) BenchmarkStats {
	sorted := make([]time.Duration, len(durations))
	copy(sorted, durations)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })

	var total time.Duration
	for _, d := range sorted {
		total += d
	}

	return BenchmarkStats{
		Name:      name,
		Durations: sorted,
		Mean:      total / time.Duration(len(sorted)),
		Median:    getPercentile(sorted, 50),
		P90:       getPercentile(sorted, 90),
		P95:       getPercentile(sorted, 95),
		P99:       getPercentile(sorted, 99),
		Min:       sorted[0],
		Max:       sorted[len(sorted)-1],
	}
}

func getPercentile(sorted []time.Duration, percentile float64) time.Duration {
	if len(sorted) == 0 {
		return 0
	}
	index := (percentile / 100.0) * float64(len(sorted)-1)
	lower := int(math.Floor(index))
	upper := int(math.Ceil(index))

	if lower == upper {
		return sorted[lower]
	}

	weight := index - float64(lower)
	return time.Duration(float64(sorted[lower])*(1.0-weight) + float64(sorted[upper])*weight)
}

func printReport(stats BenchmarkStats) {
	fmt.Printf("\n==========================================")
	fmt.Printf("\n Results for: %s", stats.Name)
	fmt.Printf("\n==========================================")
	fmt.Printf("\n  Min:    %v", stats.Min)
	fmt.Printf("\n  Max:    %v", stats.Max)
	fmt.Printf("\n  Mean:   %v", stats.Mean)
	fmt.Printf("\n  p50:    %v (Median)", stats.Median)
	fmt.Printf("\n  p90:    %v", stats.P90)
	fmt.Printf("\n  p95:    %v", stats.P95)
	fmt.Printf("\n  p99:    %v\n", stats.P99)
}

func main() {
	// Verify directory existence
	if _, err := os.Stat(ENTRY_POINT); os.IsNotExist(err) {
		fmt.Printf("Error: Target path %s does not exist.\n", ENTRY_POINT)
		return
	}

	seqStats := runBenchmark("Sequential (filepath.WalkDir)", func() Output {
		output, _ := walkSequential(ENTRY_POINT)
		return output
	})

	fmt.Println()

	concurrentStats := runBenchmark("Concurrent (Goroutines + Channels)", func() Output {
		output := runConcurrent(ENTRY_POINT)
		return output
	})

	printReport(seqStats)
	printReport(concurrentStats)
}
